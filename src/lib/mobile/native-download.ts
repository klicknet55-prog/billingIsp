import { isNativeCapacitor, toCapacitorAbsoluteUrl } from "@/lib/mobile/capacitor-runtime";

type BrowserPlugin = {
  open: (options: { url: string }) => Promise<void>;
};

type FilesystemPlugin = {
  writeFile: (options: {
    path: string;
    data: string;
    directory: string;
    recursive?: boolean;
  }) => Promise<{ uri: string }>;
};

type SharePlugin = {
  share: (options: {
    title?: string;
    text?: string;
    url?: string;
    files?: string[];
    dialogTitle?: string;
  }) => Promise<void>;
};

function getPlugins() {
  if (typeof window === "undefined") {
    return { browser: null, filesystem: null, share: null };
  }
  const plugins = (window as Window & {
    Capacitor?: {
      Plugins?: {
        Browser?: BrowserPlugin;
        Filesystem?: FilesystemPlugin;
        Share?: SharePlugin;
      };
    };
  }).Capacitor?.Plugins;

  return {
    browser: plugins?.Browser ?? null,
    filesystem: plugins?.Filesystem ?? null,
    share: plugins?.Share ?? null,
  };
}

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
 * Simpan / bagikan file di APK Capacitor (Share sheet → Files / Drive / WhatsApp).
 * Di browser desktop: unduh via anchor download.
 */
export async function saveOrShareBlob(input: {
  blob: Blob;
  filename: string;
  title?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const { blob, filename, title } = input;

  if (!isNativeCapacitor()) {
    triggerBrowserDownload(blob, filename);
    return { ok: true };
  }

  const { filesystem, share } = getPlugins();

  // Prefer Filesystem + Share agar file benar-benar tersimpan / bisa dibagikan
  if (filesystem?.writeFile && share?.share) {
    try {
      const data = await blobToBase64(blob);
      const safeName = filename.replace(/[^\w.\-() +\u00c0-\u024f]+/g, "_");
      const path = `netmanage/${Date.now()}-${safeName}`;
      const written = await filesystem.writeFile({
        path,
        data,
        directory: "CACHE",
        recursive: true,
      });
      await share.share({
        title: title ?? filename,
        dialogTitle: title ?? "Simpan atau bagikan",
        files: [written.uri],
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // User menutup sheet bagikan — bukan error fatal
      if (/cancel|abort|dismiss|share canceled/i.test(msg)) {
        return { ok: true };
      }
      console.warn("native share failed", err);
      return {
        ok: false,
        message: "Gagal menyimpan file. Coba lagi atau bagikan ke Files/Downloads.",
      };
    }
  }

  return {
    ok: false,
    message:
      "Fitur unduh APK belum lengkap. Rebuild APK setelah menambahkan plugin Filesystem + Share (cap sync).",
  };
}

/**
 * Unduh dari URL terautentikasi (cookie WebView).
 * Di APK: fetch → Share. Di browser: navigasi / anchor.
 */
export async function downloadAuthenticatedUrl(input: {
  pathOrUrl: string;
  filename: string;
  title?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const url = toCapacitorAbsoluteUrl(input.pathOrUrl);

  if (!isNativeCapacitor()) {
    // Desktop / mobile browser: navigasi attachment cukup
    const a = document.createElement("a");
    a.href = url;
    a.download = input.filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { ok: true };
  }

  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: { Accept: "*/*" },
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

    // Pakai filename dari Content-Disposition jika ada
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
    // Fallback Browser Custom Tab (Download Manager) — cookie domain sering ikut
    const { browser } = getPlugins();
    if (browser?.open) {
      try {
        await browser.open({ url });
        return {
          ok: true,
          message: "Membuka unduhan di browser sistem. Simpan file dari sana.",
        };
      } catch {
        /* fall through */
      }
    }
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal mengunduh file.",
    };
  }
}

/**
 * Buka dokumen HTML print (laporan PDF) di browser sistem — tidak menumpuk history WebView.
 */
export async function openPrintDocumentUrl(pathOrUrl: string): Promise<{ ok: boolean; message?: string }> {
  const url = toCapacitorAbsoluteUrl(pathOrUrl);

  if (!isNativeCapacitor()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true };
  }

  const { browser } = getPlugins();
  if (browser?.open) {
    try {
      await browser.open({ url });
      return {
        ok: true,
        message: "Laporan dibuka di browser. Gunakan menu Cetak / Simpan sebagai PDF.",
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Gagal membuka laporan.",
      };
    }
  }

  // Tanpa Browser plugin — jangan pakai location.assign (bikin back stuck)
  return {
    ok: false,
    message: "Plugin Browser belum ada di APK. Rebuild setelah cap sync.",
  };
}

export { isNativeCapacitor };
