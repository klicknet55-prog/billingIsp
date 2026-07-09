import "server-only";

import { randomBytes } from "node:crypto";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { extendTenantSubscription } from "@/features/tenants/service";
import { db } from "@/lib/db";
import {
  packageTenants,
  referralRewards,
  subscriptions,
  tenants,
  type ReferralReward,
} from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("referrals");

export type ReferralRewardStatus = ReferralReward["status"];

export type ReferralSettings = {
  enabled: boolean;
  rewardDays: number;
  maxPerTenant: number;
};

export type ReferredTenantRow = {
  id: string;
  namaUsaha: string;
  domain: string;
  packageName: string;
  registeredAt: Date;
  status: ReferralRewardStatus;
  refereeStatus: string;
  rewardDays: number;
  rewardedAt: Date | null;
};

export type ReferralDashboard = {
  enabled: boolean;
  code: string;
  link: string;
  rewardDays: number;
  maxPerTenant: number;
  successCount: number;
  remainingQuota: number;
  totalRewardDays: number;
  referredTenants: ReferredTenantRow[];
};

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export async function getReferralSettings(): Promise<ReferralSettings> {
  const settings = await getPlatformSettings();
  return {
    enabled: settings.referralEnabled ?? false,
    rewardDays: Math.max(1, settings.referralRewardDays ?? 7),
    maxPerTenant: Math.max(1, settings.referralMaxPerTenant ?? 10),
  };
}

function generateReferralCode(): string {
  let suffix = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    suffix += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }
  return `NM-${suffix}`;
}

export function buildReferralLink(code: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  const path = `/register-tenant?ref=${encodeURIComponent(code)}`;
  return base ? `${base}${path}` : path;
}

export async function ensureTenantReferralCode(tenantId: string): Promise<string> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { id: true, referralCode: true },
  });
  if (!tenant) throw new Error("Tenant tidak ditemukan.");
  if (tenant.referralCode) return tenant.referralCode;

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateReferralCode();
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.referralCode, code),
      columns: { id: true },
    });
    if (existing) continue;

    await db.update(tenants).set({ referralCode: code }).where(eq(tenants.id, tenantId));
    return code;
  }

  throw new Error("Gagal membuat kode referral unik.");
}

export async function findReferrerByCode(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  return db.query.tenants.findFirst({
    where: eq(tenants.referralCode, normalized),
  });
}

async function countActiveReferrals(referrerTenantId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(referralRewards)
    .where(
      and(
        eq(referralRewards.referrerTenantId, referrerTenantId),
        inArray(referralRewards.status, ["pending", "rewarded"])
      )
    );
  return Number(row?.total ?? 0);
}

export async function validateReferralCodeForRegistration(code: string) {
  const settings = await getReferralSettings();
  const normalized = normalizeReferralCode(code);

  if (!normalized) {
    return { ok: false as const, reason: "empty" as const };
  }
  if (!settings.enabled) {
    return { ok: false as const, reason: "disabled" as const };
  }

  const referrer = await findReferrerByCode(normalized);
  if (!referrer) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const used = await countActiveReferrals(referrer.id);
  if (used >= settings.maxPerTenant) {
    return {
      ok: false as const,
      reason: "quota" as const,
      referrer,
      rewardDays: settings.rewardDays,
    };
  }

  return {
    ok: true as const,
    referrer,
    rewardDays: settings.rewardDays,
    referralCode: normalized,
  };
}

export async function recordReferralAtRegistration(
  refereeTenantId: string,
  code: string
): Promise<{ error?: string } | null> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const validation = await validateReferralCodeForRegistration(normalized);
  if (!validation.ok) {
    if (validation.reason === "disabled") {
      return { error: "Program referral belum aktif." };
    }
    if (validation.reason === "invalid") {
      return { error: "Kode referral tidak valid." };
    }
    if (validation.reason === "quota" && validation.referrer) {
      await db.insert(referralRewards).values({
        id: newId("ref"),
        referrerTenantId: validation.referrer.id,
        refereeTenantId,
        referralCode: normalized,
        rewardDays: 0,
        status: "rejected",
        rejectReason: "Kuota referral pengundang sudah habis",
      });
      await db
        .update(tenants)
        .set({ referredByTenantId: validation.referrer.id })
        .where(eq(tenants.id, refereeTenantId));
      return null;
    }
    return null;
  }

  await db.insert(referralRewards).values({
    id: newId("ref"),
    referrerTenantId: validation.referrer.id,
    refereeTenantId,
    referralCode: validation.referralCode,
    rewardDays: validation.rewardDays,
    status: "pending",
  });
  await db
    .update(tenants)
    .set({ referredByTenantId: validation.referrer.id })
    .where(eq(tenants.id, refereeTenantId));

  return null;
}

export async function applyReferralReward(refereeTenantId: string): Promise<boolean> {
  const reward = await db.query.referralRewards.findFirst({
    where: eq(referralRewards.refereeTenantId, refereeTenantId),
  });
  if (!reward || reward.status !== "pending") return false;

  try {
    await extendTenantSubscription(reward.referrerTenantId, { days: reward.rewardDays });
    await db
      .update(referralRewards)
      .set({ status: "rewarded", rewardedAt: new Date() })
      .where(eq(referralRewards.id, reward.id));
    log.info(
      `Referral reward +${reward.rewardDays}d untuk tenant ${reward.referrerTenantId} dari pendaftar ${refereeTenantId}`
    );
    return true;
  } catch (err) {
    log.error(
      `Gagal apply referral reward ${reward.id}: ${err instanceof Error ? err.message : err}`
    );
    return false;
  }
}

export async function listReferredTenants(referrerTenantId: string): Promise<ReferredTenantRow[]> {
  const rows = await db
    .select({
      id: referralRewards.id,
      namaUsaha: tenants.namaUsaha,
      domain: tenants.domain,
      packageName: packageTenants.nama,
      registeredAt: tenants.createdAt,
      status: referralRewards.status,
      refereeStatus: tenants.status,
      rewardDays: referralRewards.rewardDays,
      rewardedAt: referralRewards.rewardedAt,
    })
    .from(referralRewards)
    .innerJoin(tenants, eq(referralRewards.refereeTenantId, tenants.id))
    .leftJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
    .leftJoin(packageTenants, eq(subscriptions.packageTenantId, packageTenants.id))
    .where(eq(referralRewards.referrerTenantId, referrerTenantId))
    .orderBy(desc(referralRewards.createdAt));

  return rows.map((row) => ({
    id: row.id,
    namaUsaha: row.namaUsaha,
    domain: row.domain,
    packageName: row.packageName ?? "—",
    registeredAt: row.registeredAt,
    status: row.status,
    refereeStatus: row.refereeStatus,
    rewardDays: row.rewardDays,
    rewardedAt: row.rewardedAt,
  }));
}

async function healPendingReferralRewards(referrerTenantId: string) {
  const pending = await db.query.referralRewards.findMany({
    where: and(
      eq(referralRewards.referrerTenantId, referrerTenantId),
      eq(referralRewards.status, "pending")
    ),
    columns: { refereeTenantId: true },
  });
  for (const reward of pending) {
    const referee = await db.query.tenants.findFirst({
      where: eq(tenants.id, reward.refereeTenantId),
      columns: { status: true },
    });
    if (referee?.status === "active") {
      await applyReferralReward(reward.refereeTenantId);
    }
  }
}

export async function getReferralDashboard(tenantId: string): Promise<ReferralDashboard> {
  const settings = await getReferralSettings();
  const code = await ensureTenantReferralCode(tenantId);
  await healPendingReferralRewards(tenantId);
  const referredTenants = await listReferredTenants(tenantId);

  const successCount = referredTenants.filter((row) => row.status === "rewarded").length;
  const totalRewardDays = referredTenants
    .filter((row) => row.status === "rewarded")
    .reduce((sum, row) => sum + row.rewardDays, 0);
  const activeCount = referredTenants.filter((row) =>
    ["pending", "rewarded"].includes(row.status)
  ).length;

  return {
    enabled: settings.enabled,
    code,
    link: buildReferralLink(code),
    rewardDays: settings.rewardDays,
    maxPerTenant: settings.maxPerTenant,
    successCount,
    remainingQuota: Math.max(0, settings.maxPerTenant - activeCount),
    totalRewardDays,
    referredTenants,
  };
}
