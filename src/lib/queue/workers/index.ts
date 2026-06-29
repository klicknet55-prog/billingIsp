import { Worker, type Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import { resolveWebhookBackoff } from "../client";
import { getQueueConcurrency, isQueueEnabled } from "../config";
import { closeRedisConnection, getQueueConnection } from "../connection";
import { processQueueJob } from "../processors";
import { QUEUE_NAME, type JobDataMap, type JobName } from "../types";

const log = createLogger("queue:worker");

let worker: Worker | null = null;

export function startQueueWorker() {
  if (!isQueueEnabled()) {
    throw new Error("Queue tidak aktif — set REDIS_URL atau QUEUE_DRIVER=redis.");
  }

  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const name = job.name as JobName;
      return processQueueJob(name, job.data as JobDataMap[JobName]);
    },
    {
      connection: getQueueConnection(),
      concurrency: getQueueConcurrency(),
      settings: {
        backoffStrategy: (attemptsMade, _type, _err, job) => {
          if (job?.name === "webhook.deliver") {
            return resolveWebhookBackoff(attemptsMade - 1);
          }
          return Math.min(30_000 * 2 ** attemptsMade, 300_000);
        },
      },
    }
  );

  worker.on("completed", (job) => {
    log.info(`Job selesai ${job.name}#${job.id}`);
  });

  worker.on("failed", (job, err) => {
    log.error(`Job gagal ${job?.name}#${job?.id}: ${err.message}`);
  });

  worker.on("error", (err) => {
    log.error(`Worker error: ${err.message}`);
  });

  log.info(`Worker ${QUEUE_NAME} started (concurrency=${getQueueConcurrency()})`);
  return worker;
}

export async function stopQueueWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  await closeRedisConnection();
}
