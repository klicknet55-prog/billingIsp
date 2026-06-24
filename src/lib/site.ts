/** Nama brand platform saat tenant belum punya nama usaha custom. */
export const DEFAULT_BRAND_NAME = "BILLING RT-RW NET";

/** Label tim pengembang di footer copyright. */
export const COPYRIGHT_TEAM_LABEL = "TEAM KLICKnet";

export function resolveAppOrigin(
  host?: string | null,
  proto?: string | null
): string {
  if (host) {
    const scheme = proto?.split(",")[0]?.trim() || "https";
    return `${scheme}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}
