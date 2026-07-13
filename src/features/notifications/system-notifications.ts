import "server-only";

import { startOfDay } from "@/features/jobs/billing";
import { getStaffAccessMode } from "@/features/tenants/saas-access";
import { getTenantSubscriptionStatus } from "@/features/tenants/service";
import { getCurrentActor } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import type { MobileNotificationItem } from "./notification-feed";

function daysUntilExpiry(akhir: Date): number {
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(akhir).getTime() - startOfDay(now).getTime()) / DAY);
}

/** Notifikasi in-app (bukan push) untuk admin mobile — mis. peringatan langganan SaaS. */
export async function listAdminSystemNotifications(): Promise<MobileNotificationItem[]> {
  const actor = await getCurrentActor();
  if (!actor || actor.type !== "user") return [];
  if (actor.user.role !== "owner" && actor.user.role !== "admin") return [];
  if (!actor.user.tenantId) return [];

  const tenantId = actor.user.tenantId;
  const [accessMode, subscription] = await Promise.all([
    getStaffAccessMode(actor.user),
    getTenantSubscriptionStatus(tenantId),
  ]);

  const now = new Date().toISOString();
  const dayKey = now.slice(0, 10);
  const items: MobileNotificationItem[] = [];

  if (accessMode === "renewal_only") {
    items.push({
      id: `system:renewal-only:${dayKey}`,
      title: "Langganan Free berakhir",
      body: "Paket Free telah berakhir. Anda hanya dapat memperpanjang langganan via donasi.",
      eventType: "subscription.renewal_only",
      href: "/dashboard/langganan",
      createdAt: now,
    });
    return items;
  }

  if (!subscription) return items;

  const daysLeft = daysUntilExpiry(subscription.akhir);
  const expiryLabel = formatDate(subscription.akhir);

  if (subscription.status === "expired") {
    items.push({
      id: `system:subscription-expired:${dayKey}`,
      title: "Langganan platform berakhir",
      body: `Langganan berakhir ${expiryLabel}. Akses ISP ditangguhkan setelah cron berjalan — perpanjang langganan.`,
      eventType: "subscription.expired",
      href: "/dashboard/langganan",
      createdAt: now,
    });
    return items;
  }

  if (subscription.status === "active" && daysLeft <= 7) {
    const when =
      daysLeft <= 0 ? " (hari ini)" : daysLeft === 1 ? " (besok)" : ` (${daysLeft} hari lagi)`;
    items.push({
      id: `system:subscription-expiring:${dayKey}`,
      title: "Langganan segera berakhir",
      body: `Langganan platform berakhir ${expiryLabel}${when}. Perpanjang sekarang.`,
      eventType: "subscription.expiring",
      href: "/dashboard/langganan",
      createdAt: now,
    });
  }

  return items;
}
