/** Package Android shell MyWiFi (portal pelanggan). */
export const MYWIFI_ANDROID_PACKAGE = "id.tunnelhost.netmanage.portal";

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

/** Host domain untuk Android App Links (tanpa scheme). */
export function getPortalAppLinkHost(): string | null {
  const origin = appOrigin();
  if (!origin) return null;
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

/**
 * URL intent Android: buka MyWiFi jika terinstall, fallback ke browser HTTPS.
 * Dipakai di pesan WhatsApp (pelanggan Android).
 */
export function buildMyWifiAndroidIntentUrl(browserUrl: string): string {
  const absolute = browserUrl.startsWith("http")
    ? browserUrl
    : `${appOrigin() || "https://localhost"}${browserUrl.startsWith("/") ? browserUrl : `/${browserUrl}`}`;

  let parsed: URL;
  try {
    parsed = new URL(absolute);
  } catch {
    return browserUrl;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return absolute;
  }

  const fallback = encodeURIComponent(parsed.toString());
  const intentPath = `${parsed.host}${parsed.pathname}${parsed.search}`;

  return (
    `intent://${intentPath}#Intent;` +
    `scheme=${parsed.protocol.replace(":", "")};` +
    `package=${MYWIFI_ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${fallback};` +
    `end`
  );
}

/** Bungkus link bayar portal untuk pengiriman pesan (APK-first di Android). */
export function wrapPortalPayUrlForMessaging(browserUrl: string): string {
  if (!browserUrl.startsWith("http")) return browserUrl;
  return buildMyWifiAndroidIntentUrl(browserUrl);
}
