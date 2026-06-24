import { requireUser } from "@/lib/auth";
import { listInvoices } from "@/features/invoices/service";
import { getFinancialSummary, listPengeluaran } from "@/features/reports/service";
import { formatDate, formatRupiah } from "@/lib/utils";

/** HTML cetak laporan (simpan sebagai PDF via browser). Tanpa layout dashboard. */
export async function GET(req: Request) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const type = new URL(req.url).searchParams.get("type") === "pnl" ? "pnl" : "invoice";

  const html =
    type === "pnl" ? await renderPnlHtml(tenantId) : await renderInvoiceHtml(tenantId);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function renderPnlHtml(tenantId: string) {
  const [summary, spend] = await Promise.all([
    getFinancialSummary(tenantId),
    listPengeluaran(tenantId),
  ]);
  const rows = spend
    .map(
      (p) =>
        `<tr><td>${esc(formatDate(p.tanggal))}</td><td>${esc(p.kategoriNama ?? "Umum")}</td><td>${esc(p.catatan ?? "-")}</td><td>${esc(formatRupiah(p.jumlah))}</td></tr>`
    )
    .join("");
  return wrapHtml(
    "Laporan P&L",
    `<p>Pemasukan: ${esc(formatRupiah(summary.pemasukan))}</p>
     <p>Pengeluaran: ${esc(formatRupiah(summary.pengeluaran))}</p>
     <p>Laba/Rugi: ${esc(formatRupiah(summary.laba))}</p>
     <table><thead><tr><th>Tanggal</th><th>Kategori</th><th>Catatan</th><th>Jumlah</th></tr></thead><tbody>${rows}</tbody></table>`
  );
}

async function renderInvoiceHtml(tenantId: string) {
  const invoices = await listInvoices(tenantId);
  const rows = invoices
    .map(
      (i) =>
        `<tr><td>${esc(i.noInvoice)}</td><td>${esc(i.pelangganNama)}</td><td>${esc(formatRupiah(i.totalTagihan))}</td><td>${esc(i.status)}</td><td>${i.tglJatuhTempo ? esc(formatDate(i.tglJatuhTempo)) : "-"}</td></tr>`
    )
    .join("");
  return wrapHtml(
    "Laporan Invoice",
    `<table><thead><tr><th>No Invoice</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Jatuh Tempo</th></tr></thead><tbody>${rows}</tbody></table>`
  );
}

function wrapHtml(title: string, body: string) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:1.25rem}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f5f5f5}@media print{body{padding:0}}</style></head>
<body><h1>${esc(title)}</h1><p>Dicetak: ${esc(new Date().toLocaleString("id-ID"))}</p>${body}
<script>window.onload=function(){window.print()}</script></body></html>`;
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
