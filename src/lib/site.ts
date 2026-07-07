/** Nama brand platform saat tenant belum punya nama usaha custom. */
export const DEFAULT_BRAND_NAME = "BILLING RT-RW NET";

/** Label tim pengembang di footer copyright. */
export const COPYRIGHT_TEAM_LABEL = "TEAM KLICKnet";

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
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}
