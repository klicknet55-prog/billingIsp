import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/features/invoices/service";

/** Ekspor invoice ke CSV (kompatibel Excel). PDF dapat ditambahkan menyusul. */
export async function GET() {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const rows = await listInvoices(user.tenantId!);

  const header = ["No Invoice", "Pelanggan", "Total", "Status", "Jatuh Tempo", "Tgl Lunas"];
  const lines = rows.map((i) =>
    [
      i.noInvoice,
      `"${i.pelangganNama.replace(/"/g, '""')}"`,
      i.totalTagihan,
      i.status,
      i.tglJatuhTempo ? new Date(i.tglJatuhTempo).toISOString().slice(0, 10) : "",
      i.tglLunas ? new Date(i.tglLunas).toISOString().slice(0, 10) : "",
    ].join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-invoice.csv"`,
    },
  });
}
