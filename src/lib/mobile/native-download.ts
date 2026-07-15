import { isNativeCapacitor, toCapacitorAbsoluteUrl } from "@/lib/mobile/capacitor-runtime";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(blob);
  });
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Dynamic import plugin Capacitor dari paket npm (wajib agar bridge terdaftar di WebView remote).
 * Jangan andalkan window.Capacitor.Plugins — sering kosong tanpa import.
 */
async function loadNativeSavePlugins() {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  return { Filesystem, Directory, Share };
}

/**
 * Simpan / bagikan file di APK (Filesystem + Share sheet).
 * Browser: unduh via anchor blob.
 */
export async function saveOrShareBlob(input: {
  blob: Blob;
  filename: string;
  title?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { blob, filename, title } = input;
  const safeName = filename.replace(/[^\w.\-() +\u00c0-\u024f]+/g, "_") || "unduh.bin";

  if (!isNativeCapacitor()) {
    triggerBrowserDownload(blob, safeName);
    return { ok: true };
  }

  try {
    const { Filesystem, Directory, Share } = await loadNativeSavePlugins();
    const data = await blobToBase64(blob);
    const path = `netmanage/${Date.now()}-${safeName}`;

    const written = await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });

    await Share.share({
      title: title ?? safeName,
      dialogTitle: title ?? "Simpan atau bagikan file",
      files: [written.uri],
    });

    return {
      ok: true,
      message: "Pilih aplikasi untuk menyimpan (Files / Drive / WhatsApp).",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/cancel|abort|dismiss|share canceled|User cancelled/i.test(msg)) {
      return { ok: true };
    }
    console.warn("native share failed", err);
    return {
      ok: false,
      message:
        msg.includes("plugin") || msg.includes("not implemented")
          ? "Plugin unduh belum aktif. Rebuild APK (Filesystem + Share) lalu coba lagi."
          : `Gagal menyimpan: ${msg}`,
    };
  }
}

/**
 * Unduh file dari URL autentikasi (cookie session).
 * APK: fetch blob → Share. Browser: blob download.
 */
export async function downloadAuthenticatedUrl(input: {
  pathOrUrl: string;
  filename: string;
  title?: string;
}): Promise<{ ok: boolean; message?: string }> {
  // Prefer origin WebView saat ini (APK remote HTTPS) agar cookie session ikut
  let url = input.pathOrUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    const path = url.startsWith("/") ? url : `/${url}`;
    if (typeof window !== "undefined" && /^https?:$/i.test(window.location.protocol)) {
      url = `${window.location.origin}${path}`;
    } else {
      url = toCapacitorAbsoluteUrl(path);
    }
  }

  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "*/*" },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        ok: false,
        message: `Gagal unduh (${res.status}). Pastikan masih login lalu coba lagi.`,
      };
    }

    const blob = await res.blob();
    if (!blob.size) {
      return { ok: false, message: "File kosong dari server." };
    }

    let filename = input.filename;
    const cd = res.headers.get("Content-Disposition");
    const match = cd?.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    if (match?.[1]) {
      try {
        filename = decodeURIComponent(match[1].replace(/"/g, "").trim());
      } catch {
        filename = match[1].replace(/"/g, "").trim();
      }
    }

    return saveOrShareBlob({
      blob,
      filename,
      title: input.title,
    });
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal mengunduh file.",
    };
  }
}

/** @deprecated — gunakan downloadAuthenticatedUrl ke export?format=pdf */
export async function openPrintDocumentUrl(
  pathOrUrl: string
): Promise<{ ok: boolean; message?: string }> {
  return downloadAuthenticatedUrl({
    pathOrUrl,
    filename: "laporan.pdf",
    title: "Laporan Keuangan",
  });
}

export { isNativeCapacitor };
