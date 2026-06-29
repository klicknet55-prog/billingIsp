import type { ConnectionOptions } from "bullmq";

let cached: ConnectionOptions | null = null;

export function getQueueConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL wajib untuk queue Redis.");
  }

  if (!cached) {
    cached = {
      url,
      maxRetriesPerRequest: null,
    };
  }

  return cached;
}

export async function closeRedisConnection(): Promise<void> {
  cached = null;
}
