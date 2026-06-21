import type { ConnectionSnapshot, ModemMapStatus } from "@/lib/integrations/mikrotik/types";

const DEFAULT_TTL_MS =
  Number(process.env.MAP_MODEM_CACHE_SECONDS ?? 180) * 1000 || 180_000;

interface CacheEntry {
  expiresAt: number;
  snapshots: ConnectionSnapshot[];
}

const cache = new Map<string, CacheEntry>();

export function cacheKey(tenantId: string, routerId: string, type: string) {
  return `${tenantId}:${routerId}:${type}`;
}

export function getCachedSnapshots(key: string): ConnectionSnapshot[] | null {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.snapshots;
}

export function setCachedSnapshots(key: string, snapshots: ConnectionSnapshot[]) {
  cache.set(key, { snapshots, expiresAt: Date.now() + DEFAULT_TTL_MS });
}

export function clearModemStatusCache(tenantId?: string) {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${tenantId}:`)) cache.delete(key);
  }
}

export function resolveModemStatus(input: {
  connectionUsername: string | null | undefined;
  isIsolated: boolean;
  snapshotByUser: Map<string, ConnectionSnapshot>;
  routerReachable: boolean;
  mockMode?: boolean;
}): ModemMapStatus {
  const username = input.connectionUsername?.trim();
  if (!username || !input.routerReachable) return "unknown";
  if (input.isIsolated) return "isolir";

  const snap = input.snapshotByUser.get(username);
  if (snap) {
    if (snap.disabled) return "isolir";
    if (snap.isOnline) return "aktif";
    return "gangguan";
  }

  if (input.mockMode) {
    return username.length % 2 === 0 ? "aktif" : "gangguan";
  }
  return "unknown";
}

export const MODEM_STATUS_LABEL: Record<ModemMapStatus, string> = {
  aktif: "Aktif",
  isolir: "Isolir",
  gangguan: "Gangguan",
  unknown: "Unknown",
};

export const MODEM_STATUS_COLOR: Record<ModemMapStatus, string> = {
  aktif: "#16a34a",
  isolir: "#dc2626",
  gangguan: "#ea580c",
  unknown: "#6b7280",
};
