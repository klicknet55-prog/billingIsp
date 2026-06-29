import { Queue } from "bullmq";
import { getQueueMaxRetries, webhookRetryDelaysMs } from "./config";
import { getQueueConnection } from "./connection";
import { QUEUE_NAME, type JobDataMap, type JobName } from "./types";

let queue: Queue | null = null;

export function getJobQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        removeOnComplete: { age: 86_400, count: 500 },
        removeOnFail: { age: 604_800, count: 1000 },
      },
    });
  }
  return queue;
}

export async function addQueueJob<N extends JobName>(
  name: N,
  data: JobDataMap[N],
  opts?: { jobId?: string; delay?: number }
) {
  const maxRetries = getQueueMaxRetries();
  const backoff =
    name === "webhook.deliver"
      ? {
          type: "custom" as const,
        }
      : { type: "exponential" as const, delay: 30_000 };

  const job = await getJobQueue().add(name, data, {
    jobId: opts?.jobId,
    delay: opts?.delay,
    attempts: maxRetries + 1,
    backoff,
  });

  return job.id ?? null;
}

/** Custom backoff untuk webhook.deliver — dipakai worker. */
export function resolveWebhookBackoff(attemptsMade: number): number {
  const delays = webhookRetryDelaysMs();
  return delays[Math.min(attemptsMade, delays.length - 1)] ?? delays.at(-1)!;
}
