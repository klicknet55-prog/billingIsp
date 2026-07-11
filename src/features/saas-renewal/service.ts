import "server-only";
import { MIN_DONATION_AMOUNT } from "@/lib/donation/constants";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { extendTenantSubscription, logSaasTransaction } from "@/features/tenants/service";
import { isTenantOnFreePackage } from "@/features/tenants/saas-access";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { resolveDuitkuReturnUrl } from "@/lib/integrations/duitku/urls";
import { db } from "@/lib/db";
import { paymentGatewayLogs } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";
import { eq } from "drizzle-orm";

const log = createLogger("saas-renewal");

export async function getFreeRenewalSettings() {
  const settings = await getPlatformSettings();
  return {
    extensionDays: settings.freeRenewalExtensionDays ?? 30,
  };
}

export function isPlatformDonationConfigured(): boolean {
  return (
    process.env.DUITKU_DRIVER === "real" &&
    !!process.env.DUITKU_MERCHANT_CODE?.trim() &&
    !!process.env.DUITKU_API_KEY?.trim() &&
    !!process.env.DUITKU_CALLBACK_URL?.trim()
  );
}

export async function createFreePackageRenewal(input: {
  tenantId: string;
  userId: string;
  userName: string;
  amount: number;
  returnTo?: string;
}): Promise<{ paymentUrl: string } | { ok: true }> {
  if (!(await isTenantOnFreePackage(input.tenantId))) {
    throw new Error("Perpanjang via donasi hanya untuk paket Free.");
  }

  if (!Number.isInteger(input.amount) || input.amount < MIN_DONATION_AMOUNT) {
    throw new Error(
      `Nominal donasi minimal Rp ${MIN_DONATION_AMOUNT.toLocaleString("id-ID")}.`
    );
  }

  const { extensionDays } = await getFreeRenewalSettings();
  if (!Number.isFinite(extensionDays) || extensionDays <= 0) {
    throw new Error("Pengaturan hari perpanjang belum valid. Hubungi administrator platform.");
  }

  const renewalId = newId("ren");
  const orderId = `REN-${renewalId}`;
  const referenceId = `REN:${input.tenantId}:${extensionDays}`;

  const duitku = getDuitkuClient();
  const callbackUrl = process.env.DUITKU_CALLBACK_URL ?? "";
  const baseReturn = resolveDuitkuReturnUrl(callbackUrl);
  const returnUrl =
    input.returnTo && baseReturn
      ? `${baseReturn}${baseReturn.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(input.returnTo)}`
      : undefined;

  const trx = await duitku.createTransaction({
    orderId,
    amount: input.amount,
    productName: `Perpanjang paket Free (${extensionDays} hari)`,
    customerName: input.userName,
    returnUrl,
  });

  if (process.env.DUITKU_DRIVER === "real") {
    await logSaasTransaction({
      tenantId: input.tenantId,
      referenceId,
      orderId,
      status: "pending",
      amount: input.amount,
      paymentMethod: process.env.DUITKU_PAYMENT_METHOD ?? null,
    });
    return { paymentUrl: trx.paymentUrl };
  }

  const paid = duitku.simulatePaid(orderId, input.amount);
  await finalizeFreePackageRenewal(orderId, paid.paymentMethod);
  return { ok: true };
}

export async function finalizeFreePackageRenewal(
  orderId: string,
  paymentMethod?: string
): Promise<boolean> {
  if (!orderId.startsWith("REN-")) return false;

  const pgl = await db.query.paymentGatewayLogs.findFirst({
    where: eq(paymentGatewayLogs.duitkuOrderId, orderId),
  });
  if (!pgl || pgl.status === "success") {
    if (pgl?.status === "success") return true;
    return false;
  }

  const match = pgl.referenceId.match(/^REN:([^:]+):(\d+)$/);
  if (!match) {
    log.error(`Reference REN tidak valid: ${pgl.referenceId}`);
    return false;
  }

  const tenantId = match[1]!;
  const days = Number(match[2]);
  if (!Number.isFinite(days) || days <= 0) return false;

  await extendTenantSubscription(tenantId, { days });
  await db
    .update(paymentGatewayLogs)
    .set({
      status: "success",
      paymentMethod: paymentMethod ?? pgl.paymentMethod,
    })
    .where(eq(paymentGatewayLogs.id, pgl.id));

  log.info(`Perpanjang Free sukses ${orderId} tenant ${tenantId} +${days} hari`);
  return true;
}

export async function confirmFreeRenewalFromReturn(
  orderId: string,
  resultCode: string | undefined,
  paymentMethod?: string
): Promise<boolean> {
  if (resultCode !== "00" || !orderId.startsWith("REN-")) return false;
  return finalizeFreePackageRenewal(orderId, paymentMethod || "Duitku");
}
