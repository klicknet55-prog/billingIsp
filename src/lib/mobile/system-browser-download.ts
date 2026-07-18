import {
  isNativeCapacitor,
  toCapacitorAbsoluteUrl,
  waitForNativeCapacitor,
} from "@/lib/mobile/capacitor-runtime";
import { ensureUrlScheme } from "@/lib/site";

/** Buka URL di browser bawaan HP (Custom Tab) agar Download Manager Android jalan. */
export async function openInSystemBrowser(url: string): Promise<{ ok: boolean; message?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Hanya tersedia di perangkat." };
  }

  let resolved = url.trim();
  if (!resolved) return { ok: false, message: "URL tidak valid." };
  if (!/^https?:\/\//i.test(resolved)) {
    resolved = toCapacitorAbsoluteUrl(resolved);
  }
  if (!/^https?:\/\//i.test(resolved)) {
    resolved = ensureUrlScheme(resolved);
  }

  await waitForNativeCapacitor(1500);

  if (isNativeCapacitor()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: resolved });
      return {
        ok: true,
        message: "Dibuka di browser. File akan masuk ke folder Download HP.",
      };
    } catch (err) {
      console.warn("Browser.open failed", err);
      window.location.href = resolved;
      return {
        ok: true,
        message: "Mengarahkan ke browser untuk unduh…",
      };
    }
  }

  window.open(resolved, "_blank", "noopener,noreferrer");
  return { ok: true };
}

type TicketBody =
  | {
      kind: "laporan";
      format: "pdf" | "xlsx";
      period?: string;
      from?: string;
      to?: string;
    }
  | { kind: "nota"; receiptId: string };

/**
 * Mint tiket unduhan (session app) lalu buka di browser bawaan.
 * Cookie WebView tidak ikut ke Custom Tab — jadi pakai link bertanda tangan.
 */
export async function downloadViaSystemBrowser(
  body: TicketBody
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch("/api/download/ticket", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      url?: string;
      message?: string;
    } | null;

    if (!res.ok || !data?.ok || !data.url) {
      return {
        ok: false,
        message: data?.message ?? `Gagal menyiapkan unduhan (${res.status}).`,
      };
    }

    return openInSystemBrowser(data.url);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal mengunduh.",
    };
  }
}
