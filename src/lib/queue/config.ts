export function isQueueEnabled(): boolean {
  const driver = process.env.QUEUE_DRIVER?.trim().toLowerCase();
  if (driver === "inline" || driver === "off" || driver === "false") return false;
  if (driver === "redis") return Boolean(process.env.REDIS_URL?.trim());
  return Boolean(process.env.REDIS_URL?.trim());
}

export function getQueueConcurrency(): number {
  const raw = Number(process.env.QUEUE_CONCURRENCY ?? 5);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
}

export function getQueueMaxRetries(): number {
  const raw = Number(process.env.QUEUE_MAX_RETRIES ?? 3);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 3;
}

/** Backoff antar retry webhook (ms): ~1m, ~5m, ~30m */
export function webhookRetryDelaysMs(): number[] {
  return [60_000, 300_000, 1_800_000];
}
