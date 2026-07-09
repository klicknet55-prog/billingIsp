import "server-only";

import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { communityDonations, paymentGatewayLogs, tenants, users } from "@/lib/db/schema";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { resolveDuitkuReturnUrl } from "@/lib/integrations/duitku/urls";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";
import { MIN_COMMUNITY_DONATION } from "./constants";

const log = createLogger("community-donation");

export { MIN_COMMUNITY_DONATION } from "./constants";

export type CommunityContributorRow = {
  id: string;
  namaUsaha: string;
  domain: string;
  donorNama: string;
  donorRole: string;
  amount: number;
  paidAt: Date;
  logoUrl: string | null;
};

export type CommunityDonationStats = {
  totalAmount: number;
  contributorCount: number;
};

async function logDonationPayment(input: {
  tenantId: string;
  donationId: string;
  orderId: string;
  status: "pending" | "success" | "failed";
  amount: number;
  paymentMethod?: string | null;
}) {
  await db.insert(paymentGatewayLogs).values({
    id: newId("pgl"),
    tenantId: input.tenantId,
    referenceType: "donation",
    referenceId: input.donationId,
    duitkuOrderId: input.orderId,
    status: input.status,
    amount: input.amount,
    paymentMethod: input.paymentMethod ?? null,
  });
}

export async function createCommunityDonation(input: {
  userId: string;
  tenantId: string;
  amount: number;
  kontributorPath?: string;
}): Promise<{ paymentUrl: string } | { ok: true }> {
  if (input.amount < MIN_COMMUNITY_DONATION) {
    throw new Error(`Nominal donasi minimal Rp ${MIN_COMMUNITY_DONATION.toLocaleString("id-ID")}.`);
  }

  const [tenant, user] = await Promise.all([
    db.query.tenants.findFirst({ where: eq(tenants.id, input.tenantId) }),
    db.query.users.findFirst({ where: eq(users.id, input.userId) }),
  ]);
  if (!tenant) throw new Error("Tenant tidak ditemukan.");
  if (!user || user.tenantId !== input.tenantId) {
    throw new Error("Akun tidak valid untuk donasi.");
  }
  if (!["owner", "admin", "kolektor", "teknisi"].includes(user.role)) {
    throw new Error("Role Anda tidak dapat melakukan donasi.");
  }

  const donationId = newId("don");
  const orderId = `DON-${donationId}`;

  await db.insert(communityDonations).values({
    id: donationId,
    tenantId: tenant.id,
    userId: user.id,
    amount: input.amount,
    status: "pending",
    duitkuOrderId: orderId,
    namaUsaha: tenant.namaUsaha,
    domain: tenant.domain,
    donorNama: user.nama,
    donorRole: user.role as "owner" | "admin" | "kolektor" | "teknisi",
    logoUrl: tenant.logoUrl,
  });

  const duitku = getDuitkuClient();
  const callbackUrl = process.env.DUITKU_CALLBACK_URL ?? "";
  const baseReturn = resolveDuitkuReturnUrl(callbackUrl);
  const returnUrl =
    input.kontributorPath && baseReturn
      ? `${baseReturn}${baseReturn.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(input.kontributorPath)}`
      : undefined;

  const trx = await duitku.createTransaction({
    orderId,
    amount: input.amount,
    productName: `Donasi komunitas — ${tenant.namaUsaha}`,
    customerName: user.nama,
    customerPhone: user.phone ?? undefined,
    returnUrl,
  });

  if (process.env.DUITKU_DRIVER === "real") {
    await logDonationPayment({
      tenantId: tenant.id,
      donationId,
      orderId,
      status: "pending",
      amount: input.amount,
      paymentMethod: process.env.DUITKU_PAYMENT_METHOD ?? null,
    });
    return { paymentUrl: trx.paymentUrl };
  }

  const paid = duitku.simulatePaid(orderId, input.amount);
  await finalizeCommunityDonation(orderId, paid.paymentMethod);
  await logDonationPayment({
    tenantId: tenant.id,
    donationId,
    orderId,
    status: paid.status,
    amount: paid.amount,
    paymentMethod: paid.paymentMethod,
  });

  return { ok: true };
}

export async function finalizeCommunityDonation(
  orderId: string,
  paymentMethod?: string
): Promise<boolean> {
  const donation = await db.query.communityDonations.findFirst({
    where: eq(communityDonations.duitkuOrderId, orderId),
  });
  if (!donation || donation.status === "success") return false;

  const now = new Date();
  await db
    .update(communityDonations)
    .set({
      status: "success",
      paymentMethod: paymentMethod ?? donation.paymentMethod,
      paidAt: now,
    })
    .where(eq(communityDonations.id, donation.id));

  const pgl = await db.query.paymentGatewayLogs.findFirst({
    where: eq(paymentGatewayLogs.duitkuOrderId, orderId),
  });
  if (pgl) {
    await db
      .update(paymentGatewayLogs)
      .set({
        status: "success",
        paymentMethod: paymentMethod ?? pgl.paymentMethod,
      })
      .where(eq(paymentGatewayLogs.id, pgl.id));
  }

  log.info(`Donasi komunitas sukses ${orderId} Rp${donation.amount} dari ${donation.namaUsaha}`);
  return true;
}

/** Finalisasi dari redirect browser Duitku (penting saat webhook tidak bisa ke localhost). */
export async function confirmCommunityDonationFromReturn(
  orderId: string,
  resultCode: string | undefined,
  paymentMethod?: string
): Promise<boolean> {
  if (resultCode !== "00" || !orderId.startsWith("DON-")) return false;
  return finalizeCommunityDonation(orderId, paymentMethod || "Duitku");
}

export function resolveKontributorPath(returnTo?: string): string {
  const path = returnTo?.trim() || "/dashboard/kontributor";
  if (path.startsWith("/kolektor")) return "/kolektor/kontributor";
  if (path.startsWith("/superadmin")) return "/superadmin/kontributor";
  if (path.includes("/community")) return path.replace(/\/community$/, "/kontributor");
  return "/dashboard/kontributor";
}

export async function listCommunityContributors(limit = 200): Promise<CommunityContributorRow[]> {
  const rows = await db
    .select({
      id: communityDonations.id,
      namaUsaha: communityDonations.namaUsaha,
      domain: communityDonations.domain,
      donorNama: communityDonations.donorNama,
      donorRole: communityDonations.donorRole,
      amount: communityDonations.amount,
      paidAt: communityDonations.paidAt,
      logoUrl: communityDonations.logoUrl,
    })
    .from(communityDonations)
    .where(eq(communityDonations.status, "success"))
    .orderBy(desc(communityDonations.amount), desc(communityDonations.paidAt))
    .limit(limit);

  return rows
    .filter((row): row is typeof row & { paidAt: Date } => row.paidAt != null)
    .map((row) => ({
      id: row.id,
      namaUsaha: row.namaUsaha,
      domain: row.domain,
      donorNama: row.donorNama,
      donorRole: row.donorRole,
      amount: row.amount,
      paidAt: row.paidAt,
      logoUrl: row.logoUrl,
    }));
}

export async function getCommunityDonationStats(): Promise<CommunityDonationStats> {
  const [agg] = await db
    .select({
      totalAmount: sql<number>`coalesce(sum(${communityDonations.amount}), 0)`,
      contributorCount: count(),
    })
    .from(communityDonations)
    .where(eq(communityDonations.status, "success"));

  return {
    totalAmount: Number(agg?.totalAmount ?? 0),
    contributorCount: Number(agg?.contributorCount ?? 0),
  };
}

export function isPlatformDonationConfigured(): boolean {
  if (process.env.DUITKU_DRIVER !== "real") return true;
  return !!(
    process.env.DUITKU_MERCHANT_CODE?.trim() &&
    process.env.DUITKU_API_KEY?.trim() &&
    process.env.DUITKU_CALLBACK_URL?.trim()
  );
}
