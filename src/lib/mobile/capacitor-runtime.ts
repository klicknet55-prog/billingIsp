import { ensureUrlScheme } from "@/lib/site";

type CapWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
};

/** True di shell Capacitor native (Android/iOS), bukan browser biasa. */
export function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as CapWindow).Capacitor;
  if (cap?.isNativePlatform?.() === true) return true;
  const platform = cap?.getPlatform?.();
  return platform === "android" || platform === "ios";
}

/** Tunggu bridge Capacitor siap (setelah shell lokal redirect ke HTTPS). */
export async function waitForNativeCapacitor(timeoutMs = 2500): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isNativeCapacitor()) return true;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 50));
    if (isNativeCapacitor()) return true;
  }
  return false;
}

/** Push FCM hanya aktif jika google-services.json ada di APK + env ini true. */
export function isMobilePushEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOBILE_PUSH_ENABLED === "true";
}

/** URL absolut untuk navigasi WebView — hindari path relatif ke capacitor://localhost. */
export function toCapacitorAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin && /^https?:\/\//i.test(origin) && !origin.includes("capacitor://")) {
      return `${origin.replace(/\/$/, "")}${path}`;
    }
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return `${ensureUrlScheme(configured).replace(/\/$/, "")}${path}`;
  }

  return path;
}
