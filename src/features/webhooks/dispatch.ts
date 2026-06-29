import "server-only";
import type { WebhookEvent } from "@/lib/db/schema";
import { enqueueWebhookDelivery } from "@/features/jobs/enqueue";
import { executeWebhookDelivery } from "./deliver";

/** Kirim webhook — inline jika queue off; enqueue jika Redis aktif. */
export async function dispatchWebhookEvent(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ delivered: boolean; skipped?: string; queued?: boolean }> {
  const enqueued = await enqueueWebhookDelivery(tenantId, event, data);
  if (enqueued.queued) {
    return { delivered: true, queued: true };
  }
  return executeWebhookDelivery(tenantId, event, data);
}

/** Fire-and-forget — aman dipanggil dari alur billing. */
export function emitWebhookEvent(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): void {
  void enqueueWebhookDelivery(tenantId, event, data);
}

export { executeWebhookDelivery } from "./deliver";
