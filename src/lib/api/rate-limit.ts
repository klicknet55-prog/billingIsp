type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function limitPerMinute(): number {
  const raw = Number(process.env.API_RATE_LIMIT_PER_MIN ?? 60);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60;
}

export function checkRateLimit(keyId: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const max = limitPerMinute();
  const bucket = buckets.get(keyId);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(keyId, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  bucket.count += 1;
  return { allowed: true };
}
