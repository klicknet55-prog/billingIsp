import { PUSH_PATHS } from "@/lib/mobile/push-navigation";

/** Path in-app dari event notifikasi push (log tidak menyimpan data payload). */
export function notificationHref(eventType: string): string | null {
  switch (eventType) {
    case "payment.success":
      return PUSH_PATHS.adminTagihan;
    case "payment.success.portal":
      return PUSH_PATHS.portalTagihan;
    case "ticket.event":
      return PUSH_PATHS.adminTiket;
    case "whatsapp.integration.error":
      return PUSH_PATHS.adminIntegrasi;
    case "subscription.expiring":
    case "subscription.expired":
    case "subscription.renewal_only":
      return "/dashboard/langganan";
    default:
      return null;
  }
}
