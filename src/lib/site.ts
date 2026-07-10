/** Nama brand platform saat tenant belum punya nama usaha custom. */
export const DEFAULT_BRAND_NAME = "BILLING RT-RW NET";

/** Label tim pengembang di footer copyright. */
export const COPYRIGHT_TEAM_LABEL = "TEAM KLICKnet";

/** Tambah http/https bila NEXT_PUBLIC_APP_URL tanpa skema (mis. localhost:3000). */
export function ensureUrlScheme(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed);
  return `${isLocal ? "http" : "https"}://${trimmed}`;
}

export function normalizeAbsoluteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new URL(ensureUrlScheme(trimmed)).toString();
  } catch {
    return null;
  }
}

export function isValidAbsoluteUrl(raw: string): boolean {
  if (!raw.trim()) return true;
  return normalizeAbsoluteUrl(raw) !== null;
}

export function resolveAppOrigin(
  host?: string | null,
  proto?: string | null
): string {
  // Reverse proxy (CyberPanel/OLS/Nginx) kadang mengirim host/proto ganda: "a.com, a.com"
  const hostname = host?.split(",")[0]?.trim();
  if (hostname) {
    const scheme = proto?.split(",")[0]?.trim() || "https";
    return `${scheme}://${hostname}`;
  }
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return fromEnv ? ensureUrlScheme(fromEnv) : "";
}
