import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { devicePushTokens } from "@/lib/db/schema";

export type RegisterDevicePushTokenInput = {
  tenantId: string | null;
  subjectType: "user" | "pelanggan";
  subjectId: string;
  app: "admin" | "portal";
  token: string;
  platform?: "android";
};

/**
 * Simpan/refresh token device; token lama untuk subjek+app yang sama dinonaktifkan.
 */
export async function registerDevicePushToken(input: RegisterDevicePushTokenInput): Promise<void> {
  const now = new Date();
  await db
    .insert(devicePushTokens)
    .values({
      id: randomUUID(),
      tenantId: input.tenantId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      app: input.app,
      platform: input.platform ?? "android",
      token: input.token,
      isActive: true,
      lastSeenAt: now,
      updatedAt: now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: devicePushTokens.token,
      set: {
        tenantId: input.tenantId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        app: input.app,
        platform: input.platform ?? "android",
        isActive: true,
        lastSeenAt: now,
        updatedAt: now,
      },
    });

  await db
    .update(devicePushTokens)
    .set({
      isActive: false,
      updatedAt: now,
    })
    .where(
      and(
        eq(devicePushTokens.subjectType, input.subjectType),
        eq(devicePushTokens.subjectId, input.subjectId),
        eq(devicePushTokens.app, input.app),
        ne(devicePushTokens.token, input.token)
      )
    );
}
