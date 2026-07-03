import { MOBILE_APP_NAMES } from "@/lib/mobile/app-names";

export type MobileApkApp = "admin" | "portal";

/** Slug domain untuk nama file: isp.tunnelhost.my.id → isp-tunnelhost-my-id */
export function domainSlugFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname.replace(/\./g, "-");
  } catch {
    return "app";
  }
}

export function hostnameFromOrigin(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
}

/** Nama file aman URL (tanpa titik di tengah): Admin.net → Admin-net */
function appNameForFilename(app: MobileApkApp): string {
  return MOBILE_APP_NAMES[app].replace(/\./g, "-");
}

/** Contoh: isp-tunnelhost-my-id-Admin-net-release.apk */
export function buildApkReleaseFilename(input: {
  origin: string;
  app: MobileApkApp;
  variant?: "release" | "debug";
}): string {
  const slug = domainSlugFromOrigin(input.origin);
  const appName = appNameForFilename(input.app);
  const variant = input.variant ?? "release";
  return `${slug}-${appName}-${variant}.apk`;
}

/** Label tombol download dari nama file APK di URL. */
export function apkDisplayLabelFromUrl(url: string, fallback: string): string {
  try {
    const file = new URL(url).pathname.split("/").pop() ?? "";
    if (file.toLowerCase().endsWith(".apk")) {
      return file.replace(/\.apk$/i, "").replace(/-/g, " ");
    }
  } catch {
    /* ignore */
  }
  return fallback;
}
