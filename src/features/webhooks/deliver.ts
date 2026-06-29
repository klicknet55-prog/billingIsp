import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantWebhooks, webhookDeliveryLogs, type WebhookEvent } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";
import { signWebhookBody } from "./sign";
import {
  getTenantWebhookRow,
  getTenantWebhookSecret,
  isWebhookCircuitOpen,
} from "./service";

const log = createLogger("webhooks");
const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BODY = 2000;

export type WebhookEnvelope = {
  event: WebhookEvent;
  tenantId: string;
  timestamp: string;
  data: Record<string, unknown>;
};

function truncate(text: string, max = MAX_RESPONSE_BODY): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

async function deliverOnce(
  tenantId: string,
  webhookId: string,
  url: string,
  secret: string,
  envelope: WebhookEnvelope
): Promise<{ success: boolean; statusCode?: number; responseBody?: string; error?: string }> {
  const body = JSON.stringify(envelope);
  const signature = signWebhookBody(body, secret);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NetManage-Webhook/1.0",
        "X-NetManage-Signature": signature,
        "X-NetManage-Event": envelope.event,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const responseText = truncate(await res.text().catch(() => ""));
    const success = res.status >= 200 && res.status < 300;

    await db.insert(webhookDeliveryLogs).values({
      id: newId("wdl"),
      tenantId,
      webhookId,
      event: envelope.event,
      requestUrl: url,
      requestBody: body,
      statusCode: res.status,
      responseBody: responseText || null,
      success,
      error: success ? null : `HTTP ${res.status}`,
      durationMs: Date.now() - started,
    });

    const row = await db.query.tenantWebhooks.findFirst({ where: eq(tenantWebhooks.id, webhookId) });
    if (row) {
      await db
        .update(tenantWebhooks)
        .set({
          lastDeliveryAt: new Date(),
          failureCount: success ? 0 : row.failureCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(tenantWebhooks.id, webhookId));
    }

    return { success, statusCode: res.status, responseBody: responseText };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await db.insert(webhookDeliveryLogs).values({
      id: newId("wdl"),
      tenantId,
      webhookId,
      event: envelope.event,
      requestUrl: url,
      requestBody: body,
      success: false,
      error,
      durationMs: Date.now() - started,
    });

    const row = await db.query.tenantWebhooks.findFirst({ where: eq(tenantWebhooks.id, webhookId) });
    if (row) {
      await db
        .update(tenantWebhooks)
        .set({ failureCount: row.failureCount + 1, updatedAt: new Date() })
        .where(eq(tenantWebhooks.id, webhookId));
    }

    return { success: false, error };
  }
}

/** Eksekusi delivery webhook (sync — dipakai worker & test UI). */
export async function executeWebhookDelivery(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ delivered: boolean; skipped?: string; error?: string }> {
  const config = await getTenantWebhookRow(tenantId);
  if (!config || !config.isEnabled) {
    return { delivered: false, skipped: "webhook_disabled" };
  }

  if (event !== "webhook.test" && !config.events.includes(event)) {
    return { delivered: false, skipped: "event_not_subscribed" };
  }

  if (isWebhookCircuitOpen(config.failureCount)) {
    log.warn(`Webhook tenant ${tenantId} circuit open (${config.failureCount} failures)`);
    return { delivered: false, skipped: "circuit_open" };
  }

  const secret = await getTenantWebhookSecret(tenantId);
  if (!secret) return { delivered: false, skipped: "no_secret" };

  const envelope: WebhookEnvelope = {
    event,
    tenantId,
    timestamp: new Date().toISOString(),
    data,
  };

  const result = await deliverOnce(tenantId, config.id, config.url, secret, envelope);
  if (!result.success) {
    log.warn(`Webhook ${event} gagal ke ${config.url}: ${result.error ?? result.statusCode}`);
    return { delivered: false, error: result.error ?? `HTTP ${result.statusCode}` };
  }
  return { delivered: true };
}
