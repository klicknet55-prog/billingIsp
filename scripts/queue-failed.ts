/**
 * Daftar job gagal di queue Redis (monitoring Fase 6c).
 * Usage: npm run queue:failed
 */
import { Queue } from "bullmq";
import { getQueueConnection } from "../src/lib/queue/connection";
import { QUEUE_NAME } from "../src/lib/queue/types";

const queue = new Queue(QUEUE_NAME, { connection: getQueueConnection() });

const failed = await queue.getFailed(0, 20);
console.log(`Failed jobs: ${failed.length} (showing up to 20)`);
for (const job of failed) {
  console.log(
    `- ${job.name}#${job.id} attempts=${job.attemptsMade} error=${job.failedReason?.slice(0, 120)}`
  );
}

await queue.close();
process.exit(0);
