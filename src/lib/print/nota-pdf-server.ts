import "server-only";
import { jsPDF } from "jspdf";
import {
  buildNotaRows,
  notaPdfFilename,
  type NotaDocumentData,
} from "@/lib/print/nota-document";
import { ensureUrlScheme } from "@/lib/site";

async function loadLogoDataUrl(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl?.trim()) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim()
    ? ensureUrlScheme(process.env.NEXT_PUBLIC_APP_URL.trim()).replace(/\/$/, "")
    : "";
  const src =
    logoUrl.startsWith("http://") || logoUrl.startsWith("https://")
      ? logoUrl
      : base
        ? `${base}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`
        : null;
  if (!src) return null;
  try {
    const res = await fetch(src, { cache: "force-cache" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ctype = res.headers.get("content-type") || "image/png";
    return `data:${ctype};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function fitText(pdf: jsPDF, text: string, maxWidth: number): string {
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

/** PDF nota untuk unduhan server (browser bawaan HP / desktop). */
export async function buildNotaPdfBuffer(
  data: NotaDocumentData
): Promise<{ buffer: Buffer; filename: string }> {
  const rows = buildNotaRows(data);
  const brand = data.namaUsaha.trim() || "Nota";
  const logoData = await loadLogoDataUrl(data.logoUrl);

  const PAGE_W = 100;
  const BORDER = 4;
  const PAD = 8;
  const contentLeft = BORDER + PAD;
  const contentRight = PAGE_W - BORDER - PAD;
  const contentW = contentRight - contentLeft;
  const FONT = 10;
  const FONT_BRAND = 12;
  const LINE_H = 5.2;

  const probe = new jsPDF({ orientation: "p", unit: "mm", format: [PAGE_W, 200], compress: true });
  probe.setFont("courier", "normal");
  probe.setFontSize(FONT);

  let needH = BORDER + PAD;
  if (logoData) needH += 12;

  probe.setFont("courier", "bold");
  probe.setFontSize(FONT_BRAND);
  const brandLines = probe.splitTextToSize(brand, contentW) as string[];
  needH += brandLines.length * 5.5 + 3;

  probe.setFont("courier", "normal");
  probe.setFontSize(FONT);
  for (const row of rows) {
    if (row.kind === "line") needH += 4;
    else if (row.kind === "center") {
      needH += (probe.splitTextToSize(row.text, contentW) as string[]).length * LINE_H;
    } else {
      const leftW = Math.min(contentW * 0.45, probe.getTextWidth(row.left || " ") + 1);
      const rightMax = contentW - leftW - 2;
      const rightWrap = probe.splitTextToSize(row.right || " ", Math.max(10, rightMax)) as string[];
      needH += Math.max(1, rightWrap.length) * LINE_H;
    }
  }
  needH += BORDER + PAD + 2;
  const PAGE_H = Math.max(needH, 70);

  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
    compress: true,
  });
  pdf.setTextColor(20, 20, 20);
  pdf.setDrawColor(20, 20, 20);
  pdf.setLineWidth(0.4);
  pdf.rect(BORDER, BORDER, PAGE_W - BORDER * 2, PAGE_H - BORDER * 2);

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
      pdf.addImage(logoData, format, (PAGE_W - size) / 2, y, size, size);
      y += size + 2;
    } catch {
      /* skip */
    }
  }

  pdf.setFont("courier", "bold");
  pdf.setFontSize(FONT_BRAND);
  for (const line of brandLines) {
    const tw = pdf.getTextWidth(line);
    pdf.text(line, (PAGE_W - tw) / 2, y + 3.5);
    y += 5.5;
  }
  y += 2;

  pdf.setFont("courier", "normal");
  pdf.setFontSize(FONT);
  for (const row of rows) {
    if (row.kind === "line") {
      pdf.setLineWidth(0.3);
      pdf.line(contentLeft, y + 1, contentRight, y + 1);
      y += 4;
      continue;
    }
    if (row.kind === "center") {
      const wrap = pdf.splitTextToSize(row.text, contentW) as string[];
      for (const line of wrap) {
        pdf.text(line, (PAGE_W - pdf.getTextWidth(line)) / 2, y + 3.5);
        y += LINE_H;
      }
      continue;
    }
    const leftText = fitText(pdf, row.left || "", contentW * 0.42);
    const leftW = leftText ? pdf.getTextWidth(leftText) : 0;
    const rightMax = Math.max(12, contentW - leftW - 3);
    const rightLines = pdf.splitTextToSize(row.right || "", rightMax) as string[];
    if (leftText) pdf.text(leftText, contentLeft, y + 3.5);
    for (let i = 0; i < rightLines.length; i++) {
      const rl = rightLines[i]!;
      pdf.text(rl, contentRight - pdf.getTextWidth(rl), y + 3.5);
      if (i < rightLines.length - 1) y += LINE_H;
    }
    y += LINE_H;
  }

  return {
    buffer: Buffer.from(pdf.output("arraybuffer") as ArrayBuffer),
    filename: notaPdfFilename(data.noNota),
  };
}
