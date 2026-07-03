/** True di shell Capacitor native (Android/iOS), bukan browser biasa. */
export function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  const cap = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  return cap.Capacitor?.isNativePlatform?.() === true;
}

/** Push FCM hanya aktif jika google-services.json ada di APK + env ini true. */
export function isMobilePushEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOBILE_PUSH_ENABLED === "true";
}

/** URL absolut untuk navigasi WebView — hindari path relatif ke capacitor://localhost. */
export function toCapacitorAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return `${configured}${path}`;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin && !origin.includes("localhost")) {
      return `${origin}${path}`;
    }
  }
  return path;
}
