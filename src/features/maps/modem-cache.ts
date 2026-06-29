import "server-only";
import type { ConnectionSnapshot } from "@/lib/integrations/mikrotik/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("maps:modem-cache");

export function getModemCacheTtlSeconds(): number {
  const raw = Number(process.env.MAP_MODEM_CACHE_SECONDS ?? 180);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 180;
}

const DEFAULT_TTL_MS = getModemCacheTtlSeconds() * 1000;

interface CacheEntry {
  expiresAt: number;
  snapshots: ConnectionSnapshot[];
}

const memoryCache = new Map<string, CacheEntry>();

export function cacheKey(tenantId: string, routerId: string, type: string) {
  return `${tenantId}:${routerId}:${type}`;
}

export function modemRedisKey(internalKey: string): string {
  return `modem:${internalKey}`;
}

export async function getCachedSnapshots(key: string): Promise<ConnectionSnapshot[] | null> {
  const redis = await getRedisCacheClientLazy();
  if (redis) {
    try {
      const raw = await redis.get(modemRedisKey(key));
      if (raw) {
        const parsed = JSON.parse(raw) as ConnectionSnapshot[];
        memoryCache.set(key, {
          snapshots: parsed,
          expiresAt: Date.now() + DEFAULT_TTL_MS,
        });
        return parsed;
      }
    } catch (err) {
      log.warn(`Redis GET gagal: ${err instanceof Error ? err.message : err}`);
    }
  }

  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.snapshots;
}

export async function setCachedSnapshots(
  key: string,
  snapshots: ConnectionSnapshot[]
): Promise<void> {
  memoryCache.set(key, { snapshots, expiresAt: Date.now() + DEFAULT_TTL_MS });

  const redis = await getRedisCacheClientLazy();
  if (!redis) return;

  try {
    await redis.set(modemRedisKey(key), JSON.stringify(snapshots), "EX", getModemCacheTtlSeconds());
  } catch (err) {
    log.warn(`Redis SET gagal: ${err instanceof Error ? err.message : err}`);
  }
}

export async function clearModemStatusCache(tenantId?: string): Promise<void> {
  if (!tenantId) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`${tenantId}:`)) memoryCache.delete(key);
    }
  }

  const redis = await getRedisCacheClientLazy();
  if (!redis) return;

  const pattern = tenantId ? `modem:${tenantId}:*` : "modem:*";
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    log.warn(`Redis clear gagal: ${err instanceof Error ? err.message : err}`);
  }
}

async function getRedisCacheClientLazy() {
  const { getRedisCacheClient } = await import("@/lib/cache/redis");
  return getRedisCacheClient();
}
