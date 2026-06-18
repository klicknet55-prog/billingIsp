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

/** Origin aplikasi dari header request (server component / route handler). */
export async function getAppOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return resolveAppOrigin(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto")
  );
}
