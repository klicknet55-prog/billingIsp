/** Endpoint inquiry Duitku production (default). */
export const DUITKU_INQUIRY_URL_PRODUCTION =
  "https://passport.duitku.com/webapi/api/merchant/v2/inquiry";

/** Order platform SaaS / komunitas — selalu pakai kredensial Duitku global (.env), bukan per-tenant. */
export function isPlatformDuitkuOrder(orderId: string): boolean {
  return (
    orderId.startsWith("SUB-") ||
    orderId.startsWith("SUP-") ||
    orderId.startsWith("DON-") ||
    orderId.startsWith("REN-")
  );
}

/**
 * Prioritas: DUITKU_INQUIRY_URL (env) → nilai tersimpan tenant → production default.
 * Env diutamakan agar perubahan .env di server tidak tertahan URL sandbox lama di DB.
 */
export function resolveDuitkuInquiryUrl(storedUrl?: string | null): string {
  const fromEnv = process.env.DUITKU_INQUIRY_URL?.trim();
  if (fromEnv) return fromEnv;
  const fromRow = storedUrl?.trim();
  if (fromRow) return fromRow;
  return DUITKU_INQUIRY_URL_PRODUCTION;
}
