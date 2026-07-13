import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getCurrentActor } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushNotificationLogs } from "@/lib/db/schema";
import { notificationHref } from "@/lib/mobile/notification-routes";
import { listAdminSystemNotifications } from "./system-notifications";

export type MobileNotificationItem = {
  id: string;
  title: string;
  body: string;
  eventType: string;
  href: string | null;
  createdAt: string;
};

export async function listMobileNotificationsForActor(
  app: "admin" | "portal",
  limit = 40
): Promise<MobileNotificationItem[]> {
  const actor = await getCurrentActor();
  if (!actor) return [];

  const subjectType = actor.type === "user" ? "user" : "pelanggan";
  const subjectId = actor.type === "user" ? actor.user.id : actor.pelanggan.id;

  const rows = await db
    .select({
      id: pushNotificationLogs.id,
      title: pushNotificationLogs.title,
      body: pushNotificationLogs.body,
      eventType: pushNotificationLogs.eventType,
      createdAt: pushNotificationLogs.createdAt,
    })
    .from(pushNotificationLogs)
    .where(
      and(
        eq(pushNotificationLogs.subjectType, subjectType),
        eq(pushNotificationLogs.subjectId, subjectId),
        eq(pushNotificationLogs.app, app),
        eq(pushNotificationLogs.status, "sent")
      )
    )
    .orderBy(desc(pushNotificationLogs.createdAt))
    .limit(limit);

  const pushItems = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    eventType: row.eventType,
    href: notificationHref(row.eventType),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }));

  if (app !== "admin") {
    return pushItems;
  }

  const systemItems = await listAdminSystemNotifications();
  return [...systemItems, ...pushItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
