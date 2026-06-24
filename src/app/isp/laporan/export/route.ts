import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/features/invoices/service";
import { getFinancialSummary, listPengeluaran } from "@/features/reports/service";
import * as XLSX from "xlsx";

/** Ekspor laporan invoice / P&L ke CSV atau Excel. */
export async function GET(req: Request) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "invoice";
  const format = url.searchParams.get("format") ?? "csv";

  if (type === "pnl") {
    const [summary, spend] = await Promise.all([
      getFinancialSummary(tenantId),
      listPengeluaran(tenantId),
    ]);
    const rows = [
      ["Ringkasan", "Nilai"],
      ["Pemasukan", summary.pemasukan],
      ["Pengeluaran", summary.pengeluaran],
      ["Laba/Rugi", summary.laba],
      ["Invoice lunas", summary.invoiceLunas],
      [],
      ["Tanggal", "Kategori", "Catatan", "Jumlah"],
      ...spend.map((p) => [
        p.tanggal ? new Date(p.tanggal).toISOString().slice(0, 10) : "",
        p.kategoriNama ?? "Umum",
        p.catatan ?? "",
        p.jumlah,
      ]),
    ];
    return respond(rows, format, "laporan-pnl");
  }

  const invoices = await listInvoices(tenantId);
  const rows = [
    ["No Invoice", "Pelanggan", "Total", "Status", "Jatuh Tempo", "Tgl Lunas"],
    ...invoices.map((i) => [
      i.noInvoice,
      i.pelangganNama,
      i.totalTagihan,
      i.status,
      i.tglJatuhTempo ? new Date(i.tglJatuhTempo).toISOString().slice(0, 10) : "",
      i.tglLunas ? new Date(i.tglLunas).toISOString().slice(0, 10) : "",
    ]),
  ];
  return respond(rows, format, "laporan-invoice");
}

function respond(rows: unknown[][], format: string, basename: string) {
  if (format === "xlsx") {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Laporan");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${basename}.xlsx"`,
      },
    });
  }

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${basename}.csv"`,
    },
  });
}
