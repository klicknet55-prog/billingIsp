/** Path in-app untuk notifikasi push (FCM data payload). */
export const PUSH_PATHS = {
  adminTagihanPelanggan: (pelangganId: string) => `/dashboard/tagihan/${pelangganId}`,
  adminTagihan: "/dashboard/tagihan",
  adminTiket: "/dashboard/tiket",
  adminIntegrasi: "/dashboard/integrasi",
  portalTagihan: "/portal/tagihan",
} as const;

export function resolvePushNavigationPath(
  data: Record<string, unknown> | null | undefined
): string | null {
  if (!data) return null;

  const path = data.path;
  if (typeof path === "string" && path.startsWith("/")) {
    return path;
  }

  const eventType = typeof data.eventType === "string" ? data.eventType : "";
  switch (eventType) {
    case "payment.success":
      return typeof data.pelangganId === "string"
        ? PUSH_PATHS.adminTagihanPelanggan(data.pelangganId)
        : PUSH_PATHS.adminTagihan;
    case "payment.success.portal":
      return PUSH_PATHS.portalTagihan;
    case "ticket.event":
      return PUSH_PATHS.adminTiket;
    case "whatsapp.integration.error":
      return PUSH_PATHS.adminIntegrasi;
    default:
      return null;
  }
}
