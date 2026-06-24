import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformSettings, routers, tenants } from "@/lib/db/schema";
import { PLATFORM_SETTINGS_ID } from "@/lib/db/schema";

export interface PlatformHealth {
  tenantTotal: number;
  tenantActive: number;
  tenantSuspended: number;
  routerTotal: number;
  routerOffline: number;
  cronLastRunAt: Date | null;
  cronLastResult: Record<string, unknown> | null;
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const [tenantTotal, tenantActive, tenantSuspended, routerTotal, routerOffline, settings] =
    await Promise.all([
      db.$count(tenants),
      db.$count(tenants, eq(tenants.status, "active")),
      db.$count(tenants, eq(tenants.status, "suspended")),
      db.$count(routers),
      db.$count(routers, eq(routers.isOnline, false)),
      db.query.platformSettings.findFirst({ where: eq(platformSettings.id, PLATFORM_SETTINGS_ID) }),
    ]);

  let cronLastResult: Record<string, unknown> | null = null;
  if (settings?.cronLastResult) {
    try {
      cronLastResult = JSON.parse(settings.cronLastResult) as Record<string, unknown>;
    } catch {
      cronLastResult = null;
    }
  }

  return {
    tenantTotal,
    tenantActive,
    tenantSuspended,
    routerTotal,
    routerOffline,
    cronLastRunAt: settings?.cronLastRunAt ?? null,
    cronLastResult,
  };
}

export async function recordCronRun(result: Record<string, unknown>) {
  const now = new Date();
  const payload = JSON.stringify(result);
  const existing = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, PLATFORM_SETTINGS_ID),
  });
  if (!existing) return;
  await db
    .update(platformSettings)
    .set({ cronLastRunAt: now, cronLastResult: payload })
    .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID));
}
