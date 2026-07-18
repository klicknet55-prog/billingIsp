import {
  isNativeCapacitor,
  toCapacitorAbsoluteUrl,
  waitForNativeCapacitor,
} from "@/lib/mobile/capacitor-runtime";

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

function resolveFetchUrl(pathOrUrl: string): string {
  let url = pathOrUrl.trim();
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  if (typeof window !== "undefined" && /^https?:$/i.test(window.location.protocol)) {
    return `${window.location.origin}${path}`;
  }
  return toCapacitorAbsoluteUrl(path);
}

/**
 * Simpan blob di APK lewat Filesystem + Share sheet.
 * Fallback: unduh via anchor (WebView baru kadang mendukung).
 */
export async function saveOrShareBlob(input: {
  blob: Blob;
  filename: string;
  title?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { blob, filename, title } = input;
  const safeName = filename.replace(/[^\w.\-() +\u00c0-\u024f]+/g, "_") || "unduh.bin";

  await waitForNativeCapacitor(1500);

  if (!isNativeCapacitor()) {
    triggerBrowserDownload(blob, safeName);
    return { ok: true };
  }

  const errors: string[] = [];

  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");

    const data = await blobToBase64(blob);
    const path = `netmanage/${Date.now()}-${safeName}`;

    // Tulis ke Cache (sudah ada di file_paths.xml → FileProvider)
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });

    // getUri → content/file URI yang bisa di-share FileProvider
    let shareUri: string;
    try {
      const got = await Filesystem.getUri({ path, directory: Directory.Cache });
      shareUri = got.uri;
    } catch {
      const written = await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Cache,
        recursive: true,
      });
      shareUri = written.uri;
    }

    try {
      await Share.share({
        title: title ?? safeName,
        dialogTitle: title ?? "Simpan atau bagikan file",
        files: [shareUri],
      });
      return {
        ok: true,
        message: "Pilih aplikasi untuk menyimpan (Files / Drive / WhatsApp).",
      };
    } catch (shareErr) {
      const msg = shareErr instanceof Error ? shareErr.message : String(shareErr);
      if (/cancel|abort|dismiss|share canceled|User cancelled|canceled/i.test(msg)) {
        return { ok: true };
      }
      errors.push(`Share: ${msg}`);

      // Fallback Share.url (beberapa OEM)
      try {
        await Share.share({
          title: title ?? safeName,
          dialogTitle: title ?? "Simpan atau bagikan file",
          url: shareUri,
        });
        return {
          ok: true,
          message: "Pilih aplikasi untuk membuka/menyimpan file.",
        };
      } catch (urlErr) {
        errors.push(
          `Share.url: ${urlErr instanceof Error ? urlErr.message : String(urlErr)}`
        );
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    console.warn("native saveOrShareBlob failed", err);
  }

  // Fallback terakhir: coba unduh di WebView (Chrome WebView modern)
  try {
    triggerBrowserDownload(blob, safeName);
    return {
      ok: true,
      message: "File disiapkan. Cek notifikasi unduhan di HP.",
    };
  } catch {
    /* ignore */
  }

  const joined = errors.filter(Boolean).join(" | ");
  return {
    ok: false,
    message: joined
      ? `Gagal menyimpan file (${joined}). Rebuild APK dengan plugin Filesystem + Share.`
      : "Gagal menyimpan file. Rebuild APK lalu coba lagi.",
  };
}

/**
 * Unduh file dari URL autentikasi (cookie session WebView).
 * APK: fetch blob → Share. Browser: blob download.
 */
export async function downloadAuthenticatedUrl(input: {
  pathOrUrl: string;
  filename: string;
  title?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const url = resolveFetchUrl(input.pathOrUrl);

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

/** @deprecated */
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
