import type { NotaDocumentData } from "./nota-document";
import {
  buildNotaPrintDocument,
  buildNotaPrintFragment,
  notaPdfFilename,
} from "./nota-document";

function waitForImages(root: HTMLElement, timeoutMs = 2500): Promise<void> {
  const images = [...root.querySelectorAll("img")];
  if (images.length === 0) return Promise.resolve();

  const loads = images.map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) resolve();
        else {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }
      })
  );

  return Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

function mountOffscreenNota(data: NotaDocumentData): HTMLElement {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "302px";
  host.style.background = "#fff";
  host.style.zIndex = "-1";
  host.innerHTML = buildNotaPrintFragment(data, window.location.origin);
  document.body.appendChild(host);
  const article = host.querySelector("#nota-print");
  if (!(article instanceof HTMLElement)) {
    host.remove();
    throw new Error("Gagal menyiapkan nota untuk cetak.");
  }
  return host;
}

/** Cetak langsung — iframe HTML inline (tanpa popup kosong). */
export async function printNotaDocument(
  data: NotaDocumentData,
  title?: string
): Promise<{ ok: boolean; message?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Cetak hanya tersedia di browser." };
  }

  const html = buildNotaPrintDocument(data, window.location.origin, title);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Cetak nota");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!doc || !win) {
    iframe.remove();
    return mobilePrintFallback(html);
  }

  doc.open();
  doc.write(html);
  doc.close();

  await waitForImages(doc.body);

  return new Promise((resolve) => {
    const cleanup = () => setTimeout(() => iframe.remove(), 800);

    const runPrint = () => {
      try {
        win.focus();
        win.print();
        resolve({ ok: true });
      } catch {
        iframe.remove();
        void mobilePrintFallback(html).then(resolve);
        return;
      }
      cleanup();
    };

    if (doc.readyState === "complete") {
      setTimeout(runPrint, 150);
    } else {
      iframe.onload = () => setTimeout(runPrint, 150);
      setTimeout(runPrint, 900);
    }
  });
}

async function mobilePrintFallback(
  html: string
): Promise<{ ok: boolean; message?: string }> {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    return {
      ok: false,
      message: "Izinkan popup/tab baru untuk mencetak nota di perangkat ini.",
    };
  }
  opened.addEventListener("load", () => {
    setTimeout(() => {
      try {
        opened.print();
      } catch {
        /* user can print manual dari menu browser */
      }
    }, 400);
  });
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { ok: true };
}

/** Unduh PDF langsung (html2canvas + jsPDF). */
export async function downloadNotaPdf(
  data: NotaDocumentData
): Promise<{ ok: boolean; message?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unduh PDF hanya tersedia di browser." };
  }

  let host: HTMLElement | null = null;
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    host = mountOffscreenNota(data);
    const article = host.querySelector("#nota-print");
    if (!(article instanceof HTMLElement)) {
      throw new Error("Nota tidak ditemukan.");
    }

    await waitForImages(host);

    const canvas = await html2canvas(article, {
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 12;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    pdf.save(notaPdfFilename(data.noNota));

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal membuat PDF.",
    };
  } finally {
    host?.remove();
  }
}
