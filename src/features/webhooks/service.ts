import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import {
  tenantWebhooks,
  webhookDeliveryLogs,
  WEBHOOK_EVENTS,
  type WebhookEvent,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils";

const MAX_FAILURES = 10;

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function getTenantWebhookRow(tenantId: string) {
  return db.query.tenantWebhooks.findFirst({
    where: eq(tenantWebhooks.tenantId, tenantId),
  });
}

export async function getTenantWebhookSecret(tenantId: string): Promise<string | null> {
  const row = await getTenantWebhookRow(tenantId);
  if (!row) return null;
  return decryptSecret(row.secretEncrypted);
}

export async function upsertTenantWebhook(input: {
  tenantId: string;
  url: string;
  events: WebhookEvent[];
  isEnabled: boolean;
  regenerateSecret?: boolean;
}): Promise<{ id: string; plainSecret?: string }> {
  if (!isValidWebhookUrl(input.url)) {
    throw new Error("URL webhook harus HTTPS, atau HTTP localhost untuk pengujian.");
  }

  const events = input.events.filter((e) => WEBHOOK_EVENTS.includes(e));
  const existing = await getTenantWebhookRow(input.tenantId);
  const now = new Date();

  if (existing) {
    const plainSecret = input.regenerateSecret ? generateWebhookSecret() : undefined;
    await db
      .update(tenantWebhooks)
      .set({
        url: input.url.trim(),
        events,
        isEnabled: input.isEnabled,
        ...(plainSecret ? { secretEncrypted: encryptSecret(plainSecret) } : {}),
        updatedAt: now,
      })
      .where(eq(tenantWebhooks.id, existing.id));
    return { id: existing.id, plainSecret };
  }

  const id = newId("twh");
  const plainSecret = generateWebhookSecret();
  await db.insert(tenantWebhooks).values({
    id,
    tenantId: input.tenantId,
    url: input.url.trim(),
    secretEncrypted: encryptSecret(plainSecret),
    events,
    isEnabled: input.isEnabled,
  });
  return { id, plainSecret };
}

export async function listRecentWebhookDeliveries(tenantId: string, limit = 10) {
  return db.query.webhookDeliveryLogs.findMany({
    where: eq(webhookDeliveryLogs.tenantId, tenantId),
    orderBy: [desc(webhookDeliveryLogs.createdAt)],
    limit,
  });
}

export function isWebhookCircuitOpen(failureCount: number): boolean {
  return failureCount >= MAX_FAILURES;
}

export { MAX_FAILURES as WEBHOOK_CIRCUIT_BREAKER_MAX };
