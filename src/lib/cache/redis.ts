import "server-only";
import { createLogger } from "@/lib/logger";

const log = createLogger("cache:redis");
let disabled = false;

type RedisClient = import("ioredis").default;
let client: RedisClient | null = null;

export function isRedisCacheEnabled(): boolean {
  if (disabled) return false;
  return Boolean(process.env.REDIS_URL?.trim());
}

export async function getRedisCacheClient(): Promise<RedisClient | null> {
  if (!isRedisCacheEnabled()) return null;

  const url = process.env.REDIS_URL!.trim();
  if (!client) {
    const { default: Redis } = await import("ioredis");
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3_000,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      log.warn(`Redis error: ${err.message}`);
    });
  }

  try {
    if (client.status === "wait") await client.connect();
    await client.ping();
    return client;
  } catch (err) {
    disabled = true;
    log.warn(`Redis cache disabled: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function closeRedisCacheClient(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
  disabled = false;
}
