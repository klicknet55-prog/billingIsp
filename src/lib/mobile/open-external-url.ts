import { isNativeCapacitor, toCapacitorAbsoluteUrl } from "@/lib/mobile/capacitor-runtime";

/** URL absolut di shell Capacitor; di browser tetap seperti semula. */
export function resolveMobileUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (isNativeCapacitor()) return toCapacitorAbsoluteUrl(trimmed);
  return trimmed;
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop();
    return base && base.length > 0 ? base : "download";
  } catch {
    return "download";
  }
}

/** Buka link eksternal (WhatsApp, Telegram, gambar) — hindari target=_blank di WebView. */
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  const resolved = resolveMobileUrl(url);

  if (isNativeCapacitor()) {
    window.location.assign(resolved);
    return;
  }

  window.open(resolved, "_blank", "noopener,noreferrer");
}

/** Unduh file (APK, dll.) — di Capacitor pakai fetch+blob agar download manager Android terpanggil. */
export async function downloadMobileFile(url: string): Promise<void> {
  if (typeof window === "undefined") return;
  const resolved = resolveMobileUrl(url);

  if (!isNativeCapacitor()) {
    window.open(resolved, "_blank", "noopener,noreferrer");
    return;
  }

  const filename = filenameFromUrl(resolved);

  try {
    const res = await fetch(resolved, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.location.assign(resolved);
  }
}
