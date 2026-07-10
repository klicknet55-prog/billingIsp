import { and, eq } from "drizzle-orm";
import { changeTenantSubscriptionPackage } from "@/features/tenants/service";
import { notifyNewTenantWelcome } from "@/features/tenants/welcome";
import { applyReferralReward } from "@/features/referrals/service";
import { finalizeCommunityDonation } from "@/features/community-donation/service";
import { payTagihan } from "@/features/billing/payment-service";
import type { PaymentSelection } from "@/features/billing/tagihan-service";
import { markInvoicePaid } from "@/features/invoices/service";
import { getTenantDuitkuConfig } from "@/features/integrations/service";
import { db } from "@/lib/db";
import { invoices, paymentGatewayLogs, subscriptions, tenants, users } from "@/lib/db/schema";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { isPlatformDuitkuOrder } from "@/lib/integrations/duitku/config";
import { createLogger } from "@/lib/logger";
import { getAppOrigin } from "@/lib/site-server";

const log = createLogger("webhook:duitku");

/** Browser Duitku mengirim GET ke returnUrl; arahkan ke halaman sukses jika masih mengarah ke webhook. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin =
    (await getAppOrigin()) ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    url.origin;
  const target = new URL("/bayar/selesai", `${origin}/`);
  url.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  return Response.redirect(target, 302);
}

/**
 * Webhook callback Duitku. Menerima konfirmasi pembayaran lalu memutakhirkan
 * status invoice pelanggan atau mengaktifkan langganan tenant.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const payload: Record<string, unknown> = {};
  form.forEach((v, k) => (payload[k] = v));

  const orderId = String(payload.merchantOrderId ?? payload.orderId ?? "");
  const txLogByOrder = await db.query.paymentGatewayLogs.findFirst({
    where: eq(paymentGatewayLogs.duitkuOrderId, orderId),
  });
  let tenantIdForSignature: string | null = null;
  if (isPlatformDuitkuOrder(orderId)) {
    tenantIdForSignature = null;
  } else if (orderId.startsWith("INV-")) {
    const invoiceId = orderId.slice(4);
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    tenantIdForSignature = inv?.tenantId ?? null;
  } else if (orderId.startsWith("PAY-")) {
    const logId = orderId.slice(4);
    const tx = await db.query.paymentGatewayLogs.findFirst({
      where: eq(paymentGatewayLogs.id, logId),
    });
    tenantIdForSignature = tx?.tenantId ?? null;
  }
  const tenantDuitkuCfg = tenantIdForSignature
    ? await getTenantDuitkuConfig(tenantIdForSignature)
    : null;
  const result = getDuitkuClient().parseWebhook(payload, {
    merchantCode: tenantDuitkuCfg?.merchantCode,
    apiKey: tenantDuitkuCfg?.apiKey,
  });
  log.info(`Callback ${result.orderId} -> ${result.status}`);

  const txLog = txLogByOrder ?? (await db.query.paymentGatewayLogs.findFirst({
    where: eq(paymentGatewayLogs.duitkuOrderId, result.orderId),
  }));
  if (txLog) {
    await db
      .update(paymentGatewayLogs)
      .set({
        status: result.status,
        paymentMethod: result.paymentMethod || txLog.paymentMethod,
        amount: result.amount || txLog.amount,
      })
      .where(eq(paymentGatewayLogs.id, txLog.id));
  }

  if (result.status !== "success") {
    return new Response("OK", { status: 200 });
  }

  if (result.orderId.startsWith("PAY-")) {
    const logId = result.orderId.slice(4);
    const txLogPay =
      txLog?.id === logId
        ? txLog
        : await db.query.paymentGatewayLogs.findFirst({
            where: eq(paymentGatewayLogs.id, logId),
          });
    if (txLogPay?.referenceId.startsWith("{")) {
      try {
        const meta = JSON.parse(txLogPay.referenceId) as {
          kind?: string;
          pelangganId?: string;
          selection?: PaymentSelection;
          idempotencyKey?: string;
        };
        if (
          meta.kind === "tagihan_pay" &&
          meta.pelangganId &&
          meta.selection &&
          meta.idempotencyKey &&
          txLogPay.tenantId
        ) {
          await payTagihan({
            tenantId: txLogPay.tenantId,
            pelangganId: meta.pelangganId,
            selection: meta.selection,
            metode: result.paymentMethod || "Duitku",
            idempotencyKey: meta.idempotencyKey,
          });
        }
      } catch (err) {
        log.error(`Gagal finalisasi PAY-${logId}: ${err instanceof Error ? err.message : err}`);
      }
    }
  } else if (result.orderId.startsWith("INV-")) {
    const invoiceId = result.orderId.slice(4);
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    if (inv && inv.status !== "paid") {
      await markInvoicePaid(inv.tenantId, inv.id, result.paymentMethod || "Duitku");
    }
  } else if (result.orderId.startsWith("SUB-")) {
    const tenantId = result.orderId.slice(4);
    await db.update(tenants).set({ status: "active" }).where(eq(tenants.id, tenantId));
    await db
      .update(subscriptions)
      .set({ status: "active" })
      .where(eq(subscriptions.tenantId, tenantId));
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    const owner = await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenantId), eq(users.role, "owner")),
    });
    if (tenant && owner?.role === "owner") {
      await notifyNewTenantWelcome(tenant, owner);
    }
    await applyReferralReward(tenantId);
  } else if (result.orderId.startsWith("SUP-")) {
    const upgradeRef =
      txLog?.referenceType === "subscription" && txLog.referenceId.startsWith("UPG:")
        ? txLog.referenceId.slice(4).split(":")
        : [];
    const packageId = upgradeRef[0] ?? "";
    const billingPeriod = upgradeRef[1] === "yearly" ? "yearly" : "monthly";
    const tenantId = txLog?.tenantId ?? "";
    if (tenantId && packageId) {
      await changeTenantSubscriptionPackage(tenantId, packageId, billingPeriod);
    }
  } else if (result.orderId.startsWith("DON-")) {
    await finalizeCommunityDonation(result.orderId, result.paymentMethod || "Duitku");
  }

  return new Response("OK", { status: 200 });
}
