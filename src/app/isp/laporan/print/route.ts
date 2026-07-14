import { requireUser } from "@/lib/auth";
import {
  getLaporanKeuangan,
  laporanPeriodTitle,
  resolveLaporanRange,
} from "@/features/reports/laporan-document";
import { formatDate, formatRupiah } from "@/lib/utils";

/** HTML cetak laporan transaksi A4 (Simpan sebagai PDF via browser). */
export async function GET(req: Request) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const url = new URL(req.url);
  const range = resolveLaporanRange({
    period: url.searchParams.get("period"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  const data = await getLaporanKeuangan(tenantId, range);
  const html = renderLaporanHtml(data);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLaporanHtml(data: Awaited<ReturnType<typeof getLaporanKeuangan>>) {
  const title = laporanPeriodTitle(data.range);
  const transaksiRows =
    data.transaksi.length === 0
      ? `<tr><td colspan="6" class="empty">Tidak ada transaksi.</td></tr>`
      : data.transaksi
          .map(
            (r) => `<tr>
              <td>${esc(r.pelangganNama)}</td>
              <td>${esc(r.paketNama)}</td>
              <td class="num">${esc(formatRupiah(r.harga))}</td>
              <td>${esc(formatDate(r.tglBayar))}</td>
              <td>${esc(r.metodeBayar)}</td>
              <td>${esc(r.routerNama)}</td>
            </tr>`
          )
          .join("");

  const pengeluaranRows =
    data.pengeluaran.length === 0
      ? `<tr><td colspan="3" class="empty">Tidak ada pengeluaran.</td></tr>`
      : data.pengeluaran
          .map(
            (r) => `<tr>
              <td>${esc(r.keperluan)}</td>
              <td class="num">${esc(formatRupiah(r.biaya))}</td>
              <td>${esc(formatDate(r.tanggal))}</td>
            </tr>`
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #111;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 11px;
    line-height: 1.35;
  }
  .header {
    text-align: center;
    margin-bottom: 14px;
  }
  .header h1 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .header p {
    margin: 0;
    color: #333;
  }
  .period {
    text-align: center;
    font-weight: 700;
    font-size: 12px;
    margin: 12px 0 14px;
  }
  h2 {
    margin: 16px 0 6px;
    font-size: 12px;
    font-weight: 700;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th, td {
    border: 1px solid #c5c5c5;
    padding: 5px 6px;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  th {
    background: #166534;
    color: #fff;
    font-weight: 600;
    text-align: left;
  }
  tbody tr:nth-child(even) { background: #f0fdf4; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.empty { text-align: center; color: #666; }
  .summary {
    margin-top: 16px;
    width: 100%;
    max-width: 320px;
    margin-left: auto;
  }
  .summary table { table-layout: auto; }
  .summary td {
    border: none;
    padding: 3px 0;
    font-size: 12px;
  }
  .summary td:last-child {
    text-align: right;
    font-weight: 600;
    white-space:nowrap;
  }
  .summary tr.total td {
    border-top: 1px solid #111;
    padding-top: 6px;
    font-weight: 700;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${esc(data.header.namaUsaha)}</h1>
    <p>${esc(data.header.alamat)}</p>
    <p>No. HP: ${esc(data.header.phone)}</p>
  </div>
  <div class="period">${esc(title)}</div>

  <h2>Tabel Transaksi</h2>
  <table>
    <thead>
      <tr>
        <th style="width:18%">Nama pelanggan</th>
        <th style="width:22%">Nama paket</th>
        <th class="num" style="width:14%">Harga Paket</th>
        <th style="width:14%">Tgl Bayar</th>
        <th style="width:16%">Metod Pembayaran</th>
        <th style="width:16%">Router</th>
      </tr>
    </thead>
    <tbody>${transaksiRows}</tbody>
  </table>

  <h2>Tabel Pengeluaran</h2>
  <table>
    <thead>
      <tr>
        <th style="width:50%">Keperluan</th>
        <th class="num" style="width:25%">Biaya</th>
        <th style="width:25%">Tanggal</th>
      </tr>
    </thead>
    <tbody>${pengeluaranRows}</tbody>
  </table>

  <div class="summary">
    <table>
      <tr>
        <td>Jumlah Pemasukan</td>
        <td>${esc(formatRupiah(data.jumlahPemasukan))}</td>
      </tr>
      <tr>
        <td>Jumlah pengeluaran</td>
        <td>${esc(formatRupiah(data.jumlahPengeluaran))}</td>
      </tr>
      <tr class="total">
        <td>Total Keuntungan</td>
        <td>${esc(formatRupiah(data.totalKeuntungan))}</td>
      </tr>
    </table>
  </div>

  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}
