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

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const origin = appOrigin() || "https://localhost";
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

/** URL intent Android: buka MyWiFi jika terinstall. Fallback WAJIB ke URL login browser (?browser=1). */
export function buildMyWifiAndroidIntentUrl(targetUrl: string, browserFallbackUrl: string): string {
  let parsed: URL;
  let fallbackParsed: URL;
  try {
    parsed = new URL(toAbsoluteUrl(targetUrl));
    fallbackParsed = new URL(toAbsoluteUrl(browserFallbackUrl));
  } catch {
    return targetUrl;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return parsed.toString();
  }

  const fallback = encodeURIComponent(fallbackParsed.toString());
  const intentPath = `${parsed.host}${parsed.pathname}${parsed.search}`;

  return (
    `intent://${intentPath}#Intent;` +
    `scheme=${parsed.protocol.replace(":", "")};` +
    `package=${MYWIFI_ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${fallback};` +
    `end`
  );
}
