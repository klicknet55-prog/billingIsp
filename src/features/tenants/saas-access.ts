import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { packageTenants, subscriptions, tenants, type PackageTenant, type User } from "@/lib/db/schema";

export type StaffAccessMode = "full" | "renewal_only" | "blocked";

async function getLatestSubscriptionPackage(tenantId: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tenantId, tenantId),
    orderBy: [desc(subscriptions.mulai)],
  });
  if (!sub) return null;
  const pkg = await db.query.packageTenants.findFirst({
    where: eq(packageTenants.id, sub.packageTenantId),
  });
  return pkg ? { sub, pkg } : null;
}

export function isFreeSaasPackage(pkg: Pick<PackageTenant, "hargaBulanan">): boolean {
  return pkg.hargaBulanan <= 0;
}

export async function getTenantPackageFeatures(tenantId: string): Promise<string[]> {
  const row = await getLatestSubscriptionPackage(tenantId);
  return row?.pkg.limitasi?.fitur ?? [];
}

export async function tenantHasSaasFeature(tenantId: string, key: string): Promise<boolean> {
  const fitur = await getTenantPackageFeatures(tenantId);
  return fitur.includes(key);
}

export async function assertSaasFeature(tenantId: string, key: string): Promise<void> {
  if (!(await tenantHasSaasFeature(tenantId, key))) {
    const label = key.replace(/_/g, " ");
    throw new Error(
      `Fitur "${label}" tidak tersedia di paket langganan Anda. Upgrade paket di menu Langganan SaaS.`
    );
  }
}

export async function isTenantOnFreePackage(tenantId: string): Promise<boolean> {
  const row = await getLatestSubscriptionPackage(tenantId);
  if (!row) return false;
  return isFreeSaasPackage(row.pkg);
}

/** Mode akses staf berdasarkan status tenant + paket. */
export async function getStaffAccessMode(user: User): Promise<StaffAccessMode> {
  if (!user.tenantId) return "full";
  if (user.role !== "owner" && user.role !== "admin") {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) });
    if (tenant?.status === "suspended") return "blocked";
    return "full";
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) });
  if (!tenant) return "blocked";
  if (tenant.status !== "suspended") return "full";

  if (await isTenantOnFreePackage(user.tenantId)) return "renewal_only";
  return "blocked";
}

export const RENEWAL_ONLY_PATHS = ["/dashboard/langganan", "/bayar/selesai"] as const;

export function isRenewalOnlyPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return RENEWAL_ONLY_PATHS.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`)
  );
}
