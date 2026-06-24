import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, tenants, users } from "@/lib/db/schema";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { startOfDay } from "@/features/jobs/billing";
import { createLogger } from "@/lib/logger";
import { formatDate } from "@/lib/utils";

const log = createLogger("jobs:saas-subscription");
const DAY = 24 * 60 * 60 * 1000;

export interface SaasSubscriptionCycleResult {
  expired: number;
  suspended: number;
  reminded7d: number;
  reminded1d: number;
}

function daysUntil(end: Date, now: Date): number {
  return Math.round((startOfDay(end).getTime() - startOfDay(now).getTime()) / DAY);
}

async function notifyOwner(
  tenantId: string,
  message: string
): Promise<boolean> {
  const owner = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "owner"), eq(users.isActive, true)),
  });
  const phone = owner?.phone?.trim();
  if (!phone) {
    log.warn(`Tenant ${tenantId}: owner tanpa nomor WA — lewati reminder`);
    return false;
  }
  await getWhatsAppClient().sendNotification(phone, message, tenantId);
  return true;
}

/**
 * Cron siklus langganan SaaS platform:
 * - Expire subscription lewat `akhir` → suspend tenant
 * - Reminder WA H-7 dan H-1 ke owner (jika nomor WA diisi)
 */
export async function runSaasSubscriptionLifecycle(): Promise<SaasSubscriptionCycleResult> {
  const now = new Date();
  const result: SaasSubscriptionCycleResult = {
    expired: 0,
    suspended: 0,
    reminded7d: 0,
    reminded1d: 0,
  };

  const overdue = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.status, "active"), lt(subscriptions.akhir, now)),
  });

  for (const sub of overdue) {
    await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(eq(subscriptions.id, sub.id));
    await db.update(tenants).set({ status: "suspended" }).where(eq(tenants.id, sub.tenantId));
    result.expired++;
    result.suspended++;
    log.info(`Subscription expired → tenant ${sub.tenantId} suspended`);
  }

  const activeSubs = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.status, "active"), gt(subscriptions.akhir, now)),
  });

  for (const sub of activeSubs) {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, sub.tenantId) });
    if (!tenant || tenant.status !== "active") continue;

    const daysLeft = daysUntil(sub.akhir, now);
    const expiryLabel = formatDate(sub.akhir);

    if (daysLeft === 7 && !sub.remind7dAt) {
      const sent = await notifyOwner(
        sub.tenantId,
        `Pengingat: langganan platform ${tenant.namaUsaha} berakhir ${expiryLabel} (7 hari lagi). Perpanjang di menu Langganan SaaS.`
      );
      if (sent) {
        await db
          .update(subscriptions)
          .set({ remind7dAt: now })
          .where(eq(subscriptions.id, sub.id));
        result.reminded7d++;
      }
    }

    if (daysLeft === 1 && !sub.remind1dAt) {
      const sent = await notifyOwner(
        sub.tenantId,
        `Penting: langganan platform ${tenant.namaUsaha} berakhir besok (${expiryLabel}). Segera perpanjang agar layanan tidak ditangguhkan.`
      );
      if (sent) {
        await db
          .update(subscriptions)
          .set({ remind1dAt: now })
          .where(eq(subscriptions.id, sub.id));
        result.reminded1d++;
      }
    }
  }

  log.info("Siklus langganan SaaS selesai", result);
  return result;
}
