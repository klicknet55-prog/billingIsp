import { isNativeCapacitor, saveOrShareBlob } from "@/lib/mobile/native-download";
import type { NotaDocumentData } from "./nota-document";
import {
  buildNotaPrintDocument,
  buildNotaRows,
  notaPdfFilename,
} from "./nota-document";

function waitForImages(root: HTMLElement, timeoutMs = 3000): Promise<void> {
  const images = [...root.querySelectorAll("img")];
  if (images.length === 0) return Promise.resolve();

  const loads = images.map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) resolve();
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

function waitTwoFrames(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/** Cetak via iframe tersembunyi — tanpa buka tab/halaman blank. */
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
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "width:800px",
    "height:1200px",
    "border:0",
    "opacity:0",
    "pointer-events:none",
    "visibility:hidden",
  ].join(";");
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!doc || !win) {
    iframe.remove();
    return { ok: false, message: "Gagal menyiapkan cetak nota." };
  }

  doc.open();
  doc.write(html);
  doc.close();
  await waitForImages(doc.body);
  await waitTwoFrames();

  try {
    win.focus();
    win.print();
    const cleanup = () => {
      setTimeout(() => iframe.remove(), 500);
    };
    if (typeof win.onafterprint !== "undefined") {
      win.onafterprint = cleanup;
    }
    setTimeout(cleanup, 60_000);
    return { ok: true };
  } catch {
    iframe.remove();
    return { ok: false, message: "Gagal mencetak nota." };
  }
}

async function loadLogoDataUrl(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl?.trim()) return null;
  const src =
    logoUrl.startsWith("http://") || logoUrl.startsWith("https://")
      ? logoUrl
      : `${window.location.origin}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
  try {
    const res = await fetch(src, { credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type JsPdf = import("jspdf").jsPDF;

function fitText(pdf: JsPdf, text: string, maxWidth: number): string {
  const t = text.trim();
  if (!t) return "";
  if (pdf.getTextWidth(t) <= maxWidth) return t;
  const chars = Array.from(t);
  let out = "";
  for (const ch of chars) {
    const next = `${out}${ch}`;
    if (pdf.getTextWidth(`${next}…`) > maxWidth) break;
    out = next;
  }
  return out ? `${out}…` : "…";
}

/**
 * PDF nota — ukuran nyaman (bukan stamp kecil), padding dalam aman,
 * layout kiri/kanan tanpa spasi karakter tetap.
 */
export async function downloadNotaPdf(
  data: NotaDocumentData
): Promise<{ ok: boolean; message?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Unduh PDF hanya tersedia di browser." };
  }

  try {
    const { jsPDF } = await import("jspdf");

    const rows = buildNotaRows(data);
    const brand = data.namaUsaha.trim() || "Nota";
    const logoData = await loadLogoDataUrl(data.logoUrl);

    // Ukuran tetap nyaman dibaca di layar / print (lebar struk besar)
    const PAGE_W = 100; // mm
    const BORDER = 4; // jarak kotak dari tepi halaman
    const PAD = 8; // padding isi dari dinding kotak — mencegah teks menabrak garis
    const contentLeft = BORDER + PAD;
    const contentRight = PAGE_W - BORDER - PAD;
    const contentW = contentRight - contentLeft;
    const FONT = 10;
    const FONT_BRAND = 12;
    const LINE_H = 5.2;

    // Probe ukuran teks
    const pdf = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: [PAGE_W, 200],
      compress: true,
    });
    pdf.setFont("courier", "normal");
    pdf.setFontSize(FONT);

    // Hitung tinggi konten dulu
    let needH = BORDER + PAD;

    if (logoData) needH += 12;

    pdf.setFont("courier", "bold");
    pdf.setFontSize(FONT_BRAND);
    const brandLines = pdf.splitTextToSize(brand, contentW) as string[];
    needH += brandLines.length * 5.5 + 3;

    pdf.setFont("courier", "normal");
    pdf.setFontSize(FONT);

    for (const row of rows) {
      if (row.kind === "line") {
        needH += 4;
      } else if (row.kind === "center") {
        const wrap = pdf.splitTextToSize(row.text, contentW) as string[];
        needH += wrap.length * LINE_H;
      } else {
        // pair bisa wrap kanan jika panjang
        const leftW = Math.min(contentW * 0.45, pdf.getTextWidth(row.left || " ") + 1);
        const rightMax = contentW - leftW - 2;
        const rightWrap = pdf.splitTextToSize(row.right || " ", Math.max(10, rightMax)) as string[];
        needH += Math.max(1, rightWrap.length) * LINE_H;
      }
    }

    needH += BORDER + PAD + 2;
    const PAGE_H = Math.max(needH, 70);

    // Buat ulang dengan tinggi yang tepat
    const out = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: [PAGE_W, PAGE_H],
      compress: true,
    });

    out.setTextColor(20, 20, 20);
    out.setDrawColor(20, 20, 20);
    out.setLineWidth(0.4);
    // Kotak pembatas — isi hanya di dalam PAD
    out.rect(BORDER, BORDER, PAGE_W - BORDER * 2, PAGE_H - BORDER * 2);

    let y = BORDER + PAD;

    if (logoData) {
      try {
        const size = 10;
        const format =
          logoData.includes("image/jpeg") || logoData.includes("image/jpg")
            ? "JPEG"
            : logoData.includes("image/webp")
              ? "WEBP"
              : "PNG";
        out.addImage(logoData, format, (PAGE_W - size) / 2, y, size, size);
        y += size + 2;
      } catch {
        /* skip */
      }
    }

    out.setFont("courier", "bold");
    out.setFontSize(FONT_BRAND);
    for (const line of brandLines) {
      const tw = out.getTextWidth(line);
      out.text(line, (PAGE_W - tw) / 2, y + 3.5);
      y += 5.5;
    }
    y += 2;

    out.setFont("courier", "normal");
    out.setFontSize(FONT);

    for (const row of rows) {
      if (row.kind === "line") {
        const ly = y + 1;
        out.setLineWidth(0.3);
        out.line(contentLeft, ly, contentRight, ly);
        y += 4;
        continue;
      }

      if (row.kind === "center") {
        const wrap = out.splitTextToSize(row.text, contentW) as string[];
        for (const line of wrap) {
          const tw = out.getTextWidth(line);
          out.text(line, (PAGE_W - tw) / 2, y + 3.5);
          y += LINE_H;
        }
        continue;
      }

      // pair: kiri / kanan dalam area aman
      const leftLabel = row.left || "";
      const rightValue = row.right || "";
      const colGap = 3;
      const leftMax = contentW * 0.42;
      const leftText = fitText(out, leftLabel, leftMax);
      const leftW = leftText ? out.getTextWidth(leftText) : 0;
      const rightMax = Math.max(12, contentW - leftW - colGap);
      const rightLines = out.splitTextToSize(rightValue, rightMax) as string[];

      if (leftText) {
        out.text(leftText, contentLeft, y + 3.5);
      }
      for (let i = 0; i < rightLines.length; i++) {
        const rl = rightLines[i]!;
        const rw = out.getTextWidth(rl);
        out.text(rl, contentRight - rw, y + 3.5);
        if (i < rightLines.length - 1) y += LINE_H;
      }
      y += LINE_H;
    }

    const filename = notaPdfFilename(data.noNota);

    // APK: Share sheet (Filesystem) — jsPDF.save() sering hanya "tampil" di WebView
    if (isNativeCapacitor()) {
      const ab = out.output("arraybuffer") as ArrayBuffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      return saveOrShareBlob({
        blob,
        filename,
        title: `Nota ${data.noNota}`,
      });
    }

    out.save(filename);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal membuat PDF.",
    };
  }
}
