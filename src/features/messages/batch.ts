import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageBatches, type MessageBatchPayload } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

const MAX_BATCH_SIZE = 100;

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

  spawnBatchProcess(id);
  return id;
}

function spawnBatchProcess(batchId: string) {
  const script = path.join(process.cwd(), "scripts", "send-message-batch.ts");
  const child = spawn(process.execPath, ["--import", "tsx", script, batchId], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env, MESSAGE_BATCH_ID: batchId },
  });
  child.unref();
}

export async function getBatchStatus(batchId: string) {
  return db.query.messageBatches.findFirst({ where: eq(messageBatches.id, batchId) });
}

export { MAX_BATCH_SIZE };
