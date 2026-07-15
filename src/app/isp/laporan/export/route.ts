import { requireUser } from "@/lib/auth";
import {
  getLaporanKeuangan,
  laporanPeriodTitle,
  resolveLaporanRange,
} from "@/features/reports/laporan-document";
import { buildLaporanPdfBuffer } from "@/features/reports/laporan-pdf";
import { formatDate, formatRupiah } from "@/lib/utils";
import * as XLSX from "xlsx";

/** Ekspor laporan: Excel (xlsx), CSV, atau PDF (jsPDF A4). */
export async function GET(req: Request) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "xlsx";
  const range = resolveLaporanRange({
    period: url.searchParams.get("period"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  const data = await getLaporanKeuangan(tenantId, range);
  const title = laporanPeriodTitle(data.range);
  const basename = `laporan-${range.from.toISOString().slice(0, 10)}_${range.to.toISOString().slice(0, 10)}`;

  if (format === "pdf") {
    const buffer = buildLaporanPdfBuffer(data);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${basename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const rows: (string | number)[][] = [
    [data.header.namaUsaha],
    [data.header.alamat],
    [`No. HP: ${data.header.phone}`],
    [],
    [title],
    [],
    ["Tabel Transaksi"],
    ["Nama pelanggan", "Nama paket", "Harga Paket", "Tgl Bayar", "Metod Pembayaran", "Router"],
    ...data.transaksi.map((r) => [
      r.pelangganNama,
      r.paketNama,
      formatRupiah(r.harga),
      formatDate(r.tglBayar),
      r.metodeBayar,
      r.routerNama,
    ]),
    ...(data.transaksi.length === 0 ? [["Tidak ada transaksi", "", "", "", "", ""]] : []),
    [],
    ["Tabel Pengeluaran"],
    ["Keperluan", "Biaya", "Tanggal"],
    ...data.pengeluaran.map((r) => [r.keperluan, formatRupiah(r.biaya), formatDate(r.tanggal)]),
    ...(data.pengeluaran.length === 0 ? [["Tidak ada pengeluaran", "", ""]] : []),
    [],
    ["Jumlah Pemasukan", formatRupiah(data.jumlahPemasukan)],
    ["Jumlah pengeluaran", formatRupiah(data.jumlahPengeluaran)],
    ["Total Keuntungan", formatRupiah(data.totalKeuntungan)],
  ];

  if (format === "csv") {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            return s.includes(",") || s.includes('"') || s.includes("\n")
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(",")
      )
      .join("\n");
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${basename}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 16 },
  ];
  sheet["!pageSetup"] = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  sheet["!printHeader"] = "";
  sheet["!margins"] = {
    left: 0.5,
    right: 0.5,
    top: 0.5,
    bottom: 0.5,
    header: 0.3,
    footer: 0.3,
  };

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Laporan");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${basename}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
