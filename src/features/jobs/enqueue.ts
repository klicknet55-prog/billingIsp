import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import type { WebhookEvent } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { addQueueJob, isQueueEnabled } from "@/lib/queue";
import { runBatchSend } from "@/features/messages/send";
import { runImportBatchById } from "@/features/customers/import-service";
import { executeWebhookDelivery } from "@/features/webhooks/deliver";

const log = createLogger("jobs:enqueue");

export async function enqueueCronRun(): Promise<{ queued: boolean; jobId?: string | null }> {
  if (!isQueueEnabled()) {
    return { queued: false };
  }
  const jobId = `cron-${Date.now()}`;
  const id = await addQueueJob("cron.run", {}, { jobId });
  log.info(`cron.run enqueued as ${id ?? jobId}`);
  return { queued: true, jobId: id ?? jobId };
}

export async function enqueueMessageBatch(batchId: string): Promise<void> {
  if (isQueueEnabled()) {
    await addQueueJob("messages.batch", { batchId }, { jobId: batchId });
    log.info(`messages.batch enqueued ${batchId}`);
    return;
  }

  const runInline =
    process.env.NODE_ENV === "development" || process.env.MESSAGE_BATCH_INLINE === "1";

  if (runInline) {
    void runBatchSend(batchId).catch((err) => {
      log.error(`messages.batch inline ${batchId}: ${err instanceof Error ? err.message : err}`);
    });
    return;
  }

  const script = path.join(process.cwd(), "scripts", "send-message-batch.ts");
  const child = spawn(process.execPath, ["--import", "tsx", script, batchId], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env, MESSAGE_BATCH_ID: batchId },
  });
  child.unref();
}

export async function enqueueWebhookDelivery(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ queued: boolean }> {
  if (isQueueEnabled()) {
    const jobId = `wh-${tenantId}-${event}-${Date.now()}`;
    await addQueueJob("webhook.deliver", { tenantId, event, data }, { jobId });
    return { queued: true };
  }

  void executeWebhookDelivery(tenantId, event, data).catch((err) => {
    log.warn(`webhook inline ${event}: ${err instanceof Error ? err.message : err}`);
  });
  return { queued: false };
}

/** Fire-and-forget webhook enqueue / inline. */
export function emitWebhookViaQueue(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): void {
  void enqueueWebhookDelivery(tenantId, event, data);
}

export async function enqueuePelangganImport(batchId: string): Promise<void> {
  if (isQueueEnabled()) {
    await addQueueJob("pelanggan.import", { batchId }, { jobId: batchId });
    log.info(`pelanggan.import enqueued ${batchId}`);
    return;
  }

  void runImportBatchById(batchId).catch((err) => {
    log.error(`pelanggan.import inline ${batchId}: ${err instanceof Error ? err.message : err}`);
  });
}
