import {
  isNativeCapacitor,
  toCapacitorAbsoluteUrl,
  waitForNativeCapacitor,
} from "@/lib/mobile/capacitor-runtime";
import { ensureUrlScheme } from "@/lib/site";

/** URL absolut di shell Capacitor; di browser tetap seperti semula. */
export function resolveMobileUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (isNativeCapacitor()) return toCapacitorAbsoluteUrl(trimmed);
  if (typeof window !== "undefined" && window.location.origin.startsWith("http")) {
    return new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, window.location.origin).href;
  }
  return ensureUrlScheme(trimmed);
}

async function openWithBrowserPlugin(url: string): Promise<boolean> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
    return true;
  } catch (err) {
    console.warn("Browser.open failed", err);
    return false;
  }
}

/** Buka link eksternal (WhatsApp, Telegram, gambar) — hindari target=_blank di WebView. */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === "undefined") return;
  const resolved = resolveMobileUrl(url);
  if (!resolved) return;

  await waitForNativeCapacitor(800);

  if (isNativeCapacitor()) {
    if (await openWithBrowserPlugin(resolved)) return;
    window.location.assign(resolved);
    return;
  }

  window.open(resolved, "_blank", "noopener,noreferrer");
}

/**
 * Unduh / buka APK — di Capacitor pakai @capacitor/browser (Custom Tab)
 * agar Download Manager Android jalan. Jangan andalkan window.Capacitor.Plugins.
 */
export async function downloadApkFile(url: string): Promise<void> {
  if (typeof window === "undefined") return;
  let resolved = resolveMobileUrl(url);
  if (!resolved) throw new Error("URL unduh tidak valid.");
  if (!/^https?:\/\//i.test(resolved)) {
    resolved = ensureUrlScheme(resolved);
  }

  await waitForNativeCapacitor(1500);

  if (!isNativeCapacitor()) {
    const a = document.createElement("a");
    a.href = resolved;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  if (await openWithBrowserPlugin(resolved)) return;

  // Fallback: navigasi langsung — WebView sering tetap memicu unduhan untuk .apk
  window.location.href = resolved;
}

/** @deprecated Gunakan downloadApkFile */
export const downloadMobileFile = downloadApkFile;
