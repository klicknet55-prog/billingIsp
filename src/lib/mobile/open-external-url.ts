import { isNativeCapacitor, toCapacitorAbsoluteUrl } from "@/lib/mobile/capacitor-runtime";

/** URL absolut di shell Capacitor; di browser tetap seperti semula. */
export function resolveMobileUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (isNativeCapacitor()) return toCapacitorAbsoluteUrl(trimmed);
  return trimmed;
}

type BrowserPlugin = {
  open: (options: { url: string; presentationStyle?: "fullscreen" | "popover" }) => Promise<void>;
};

function getBrowserPlugin(): BrowserPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = window as Window & { Capacitor?: { Plugins?: { Browser?: BrowserPlugin } } };
  return cap.Capacitor?.Plugins?.Browser ?? null;
}

async function openInSystemBrowser(url: string): Promise<boolean> {
  const browser = getBrowserPlugin();
  if (!browser?.open) return false;
  await browser.open({ url });
  return true;
}

/** Buka link eksternal (WhatsApp, Telegram, gambar) — hindari target=_blank di WebView. */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === "undefined") return;
  const resolved = resolveMobileUrl(url);

  if (isNativeCapacitor()) {
    if (await openInSystemBrowser(resolved)) return;
    window.location.assign(resolved);
    return;
  }

  window.open(resolved, "_blank", "noopener,noreferrer");
}

/**
 * Unduh / buka APK — di Capacitor pakai Browser plugin agar Download Manager Android jalan.
 * Dipakai halaman Community dan (nanti) dialog auto-update.
 */
export async function downloadApkFile(url: string): Promise<void> {
  if (typeof window === "undefined") return;
  const resolved = resolveMobileUrl(url);
  if (!resolved) throw new Error("URL unduh tidak valid.");

  if (!isNativeCapacitor()) {
    window.open(resolved, "_blank", "noopener,noreferrer");
    return;
  }

  if (await openInSystemBrowser(resolved)) return;

  const opened = window.open(resolved, "_blank");
  if (opened) return;

  throw new Error("Tidak bisa membuka unduh. Rebuild APK setelah cap sync Browser plugin.");
}

/** @deprecated Gunakan downloadApkFile */
export const downloadMobileFile = downloadApkFile;
