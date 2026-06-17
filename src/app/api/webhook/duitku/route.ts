import { eq } from "drizzle-orm";
import { markInvoicePaid } from "@/features/invoices/service";
import { getTenantDuitkuConfig } from "@/features/integrations/service";
import { db } from "@/lib/db";
import { invoices, subscriptions, tenants } from "@/lib/db/schema";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { createLogger } from "@/lib/logger";

const log = createLogger("webhook:duitku");

/**
 * Webhook callback Duitku. Menerima konfirmasi pembayaran lalu memutakhirkan
 * status invoice pelanggan atau mengaktifkan langganan tenant.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const payload: Record<string, unknown> = {};
  form.forEach((v, k) => (payload[k] = v));

  const orderId = String(payload.merchantOrderId ?? payload.orderId ?? "");
  let tenantIdForSignature: string | null = null;
  if (orderId.startsWith("SUB-")) {
    tenantIdForSignature = orderId.slice(4);
  } else if (orderId.startsWith("INV-")) {
    const invoiceId = orderId.slice(4);
    const inv = await db.query.invoices.findFirst({ where: eq(invoices.id, invoiceId) });
    tenantIdForSignature = inv?.tenantId ?? null;
  }
  const tenantDuitkuCfg = tenantIdForSignature
    ? await getTenantDuitkuConfig(tenantIdForSignature)
    : null;
  const result = getDuitkuClient().parseWebhook(payload, {
    merchantCode: tenantDuitkuCfg?.merchantCode,
    apiKey: tenantDuitkuCfg?.apiKey,
  });
  log.info(`Callback ${result.orderId} -> ${result.status}`);

  if (result.status !== "success") {
    return new Response("OK", { status: 200 });
  }

  if (result.orderId.startsWith("INV-")) {
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
  }

  return new Response("OK", { status: 200 });
}
