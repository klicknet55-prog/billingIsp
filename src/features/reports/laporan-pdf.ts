import "server-only";
import { jsPDF } from "jspdf";
import type { LaporanKeuangan } from "@/features/reports/laporan-document";
import { laporanPeriodTitle } from "@/features/reports/laporan-document";
import { formatDate, formatRupiah } from "@/lib/utils";

const MARGIN = 14;
const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ensureSpace(pdf: jsPDF, y: number, need: number): number {
  if (y + need <= PAGE_H - MARGIN) return y;
  pdf.addPage();
  return MARGIN;
}

/** Generate PDF A4 laporan keuangan (Buffer). */
export function buildLaporanPdfBuffer(data: LaporanKeuangan): Buffer {
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const title = laporanPeriodTitle(data.range);

  let y = MARGIN;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(data.header.namaUsaha, PAGE_W / 2, y, { align: "center" });
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(40);
  if (data.header.alamat && data.header.alamat !== "-") {
    pdf.text(data.header.alamat, PAGE_W / 2, y, { align: "center", maxWidth: CONTENT_W });
    y += 5;
  }
  if (data.header.phone && data.header.phone !== "-") {
    pdf.text(`No. HP: ${data.header.phone}`, PAGE_W / 2, y, { align: "center" });
    y += 5;
  }

  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(0);
  pdf.text(title, PAGE_W / 2, y, { align: "center" });
  y += 8;

  // —— Transaksi ——
  pdf.setFontSize(10);
  pdf.text("Tabel Transaksi", MARGIN, y);
  y += 5;

  const txCols = [
    { label: "Pelanggan", w: 32 },
    { label: "Paket", w: 40 },
    { label: "Harga", w: 28 },
    { label: "Tgl Bayar", w: 26 },
    { label: "Metode", w: 28 },
    { label: "Router", w: 28 },
  ];
  y = drawTableHeader(pdf, y, txCols);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  if (data.transaksi.length === 0) {
    y = ensureSpace(pdf, y, 6);
    pdf.text("Tidak ada transaksi.", MARGIN, y);
    y += 6;
  } else {
    for (const r of data.transaksi) {
      const cells = [
        r.pelangganNama,
        r.paketNama,
        formatRupiah(r.harga),
        formatDate(r.tglBayar),
        r.metodeBayar,
        r.routerNama,
      ];
      y = drawTableRow(pdf, y, txCols, cells);
    }
  }

  y += 6;
  y = ensureSpace(pdf, y, 12);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Tabel Pengeluaran", MARGIN, y);
  y += 5;

  const exCols = [
    { label: "Keperluan", w: 110 },
    { label: "Biaya", w: 36 },
    { label: "Tanggal", w: 36 },
  ];
  y = drawTableHeader(pdf, y, exCols);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  if (data.pengeluaran.length === 0) {
    y = ensureSpace(pdf, y, 6);
    pdf.text("Tidak ada pengeluaran.", MARGIN, y);
    y += 6;
  } else {
    for (const r of data.pengeluaran) {
      y = drawTableRow(pdf, y, exCols, [
        r.keperluan,
        formatRupiah(r.biaya),
        formatDate(r.tanggal),
      ]);
    }
  }

  y += 8;
  y = ensureSpace(pdf, y, 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(`Jumlah Pemasukan: ${formatRupiah(data.jumlahPemasukan)}`, MARGIN, y);
  y += 6;
  pdf.text(`Jumlah Pengeluaran: ${formatRupiah(data.jumlahPengeluaran)}`, MARGIN, y);
  y += 6;
  pdf.setFontSize(11);
  pdf.text(`Total Keuntungan: ${formatRupiah(data.totalKeuntungan)}`, MARGIN, y);

  const ab = pdf.output("arraybuffer");
  return Buffer.from(ab);
}

function drawTableHeader(
  pdf: jsPDF,
  y: number,
  cols: { label: string; w: number }[]
): number {
  y = ensureSpace(pdf, y, 7);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setFillColor(240, 240, 240);
  pdf.rect(MARGIN, y - 3.5, CONTENT_W, 6, "F");
  let x = MARGIN;
  for (const col of cols) {
    pdf.text(col.label, x + 1, y);
    x += col.w;
  }
  return y + 5;
}

function drawTableRow(
  pdf: jsPDF,
  y: number,
  cols: { label: string; w: number }[],
  cells: string[]
): number {
  const linesPerCell = cells.map((c, i) =>
    pdf.splitTextToSize(String(c ?? ""), Math.max(8, cols[i]!.w - 2)) as string[]
  );
  const rowLines = Math.max(1, ...linesPerCell.map((l) => l.length));
  const rowH = rowLines * 3.6 + 1.5;
  y = ensureSpace(pdf, y, rowH);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  let x = MARGIN;
  for (let i = 0; i < cols.length; i++) {
    const lines = linesPerCell[i]!;
    let ly = y;
    for (const line of lines) {
      pdf.text(line, x + 1, ly);
      ly += 3.6;
    }
    x += cols[i]!.w;
  }
  return y + rowH;
}
