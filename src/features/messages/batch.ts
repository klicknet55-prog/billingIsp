import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageBatches, type MessageBatchPayload } from "@/lib/db/schema";
import { enqueueMessageBatch } from "@/features/jobs/enqueue";
import { newId } from "@/lib/utils";

const MAX_BATCH_SIZE = 100;
const STALE_QUEUED_MS = 90_000;

export async function hasRunningBatch(scope: "tenant" | "platform", tenantId?: string | null) {
  const row = await db.query.messageBatches.findFirst({
    where:
      scope === "tenant" && tenantId
        ? and(
            eq(messageBatches.scope, "tenant"),
            eq(messageBatches.tenantId, tenantId),
            eq(messageBatches.status, "running")
          )
        : and(eq(messageBatches.scope, "platform"), eq(messageBatches.status, "running")),
  });
  return Boolean(row);
}

export async function createMessageBatch(input: {
  scope: "tenant" | "platform";
  tenantId?: string | null;
  payload: MessageBatchPayload;
  startedBy: string;
}) {
  if (input.payload.recipientIds.length === 0) {
    throw new Error("Pilih minimal satu penerima.");
  }
  if (input.payload.recipientIds.length > MAX_BATCH_SIZE) {
    throw new Error(`Maksimal ${MAX_BATCH_SIZE} penerima per batch.`);
  }

  if (await hasRunningBatch(input.scope, input.tenantId)) {
    throw new Error("Masih ada batch kirim pesan yang berjalan. Tunggu hingga selesai.");
  }

  const id = newId("mbatch");
  await db.insert(messageBatches).values({
    id,
    scope: input.scope,
    tenantId: input.tenantId ?? null,
    status: "queued",
    total: input.payload.recipientIds.length,
    sent: 0,
    failed: 0,
    payload: input.payload,
    startedBy: input.startedBy,
    createdAt: new Date(),
  });

  void enqueueMessageBatch(id);
  return id;
}

/** Tandai batch queued yang tidak pernah jalan (worker/inline gagal). */
export async function recoverStaleBatch(batchId: string) {
  const batch = await db.query.messageBatches.findFirst({
    where: eq(messageBatches.id, batchId),
  });
  if (!batch || batch.status !== "queued") return batch;

  const age = Date.now() - batch.createdAt.getTime();
  if (age < STALE_QUEUED_MS) return batch;

  await db
    .update(messageBatches)
    .set({
      status: "failed",
      error:
        "Batch tidak dimulai (worker queue tidak jalan?). Pastikan `npm run queue:worker` aktif jika REDIS_URL diset, atau coba kirim ulang.",
      finishedAt: new Date(),
    })
    .where(eq(messageBatches.id, batchId));

  return db.query.messageBatches.findFirst({ where: eq(messageBatches.id, batchId) });
}

export async function getBatchStatus(batchId: string) {
  const batch = await db.query.messageBatches.findFirst({ where: eq(messageBatches.id, batchId) });
  if (batch?.status === "queued") {
    return recoverStaleBatch(batchId);
  }
  return batch;
}

export { MAX_BATCH_SIZE };
