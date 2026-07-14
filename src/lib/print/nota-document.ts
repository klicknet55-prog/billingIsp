import { formatRupiah } from "@/lib/utils";
import {
  NOTA_CHAR_WIDTH,
  notaPadCenter,
  notaPadLine,
  notaPads,
} from "@/lib/print/nota-pad";

export type NotaDocumentLineItem = {
  periode: string;
  label: string;
  amount: number;
};

export { NOTA_CHAR_WIDTH };

/** Data serializable untuk cetak / unduh PDF nota (client). */
export type NotaDocumentData = {
  namaUsaha: string;
  logoUrl?: string | null;
  alamat?: string | null;
  phone?: string | null;
  noNota: string;
  pelangganNama: string;
  pelangganWa?: string | null;
  pelangganAlamat?: string | null;
  tglBayar: string | null;
  metodeBayar?: string | null;
  adminNama?: string | null;
  operatorLabel?: string | null;
  jenisLayanan?: string | null;
  paketNama?: string | null;
  username?: string | null;
  dibuatPada?: string | null;
  kedaluwarsaPada?: string | null;
  periodeList?: string[];
  lineItems: NotaDocumentLineItem[];
  total: number;
  footerNote?: string | null;
  compactPelanggan?: boolean;
};

/** Baris struktural — dipakai UI (plain), cetak (tabel), PDF (jsPDF). */
export type NotaRow =
  | { kind: "center"; text: string }
  | { kind: "pair"; left: string; right: string }
  | { kind: "line" };

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatMoney(value: number): string {
  return formatRupiah(value).replace(/\u00a0/g, " ");
}

function resolveLogoUrl(logoUrl: string | null | undefined, origin: string): string | null {
  if (!logoUrl?.trim()) return null;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) return logoUrl;
  return `${origin.replace(/\/$/, "")}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
}

/** Struktur baris nota (urutan sama PHPNuxBill). */
export function buildNotaRows(data: NotaDocumentData): NotaRow[] {
  const periods =
    data.periodeList && data.periodeList.length > 0
      ? data.periodeList
      : data.lineItems.map((li) => li.periode).filter(Boolean);

  const rows: NotaRow[] = [
    { kind: "center", text: data.alamat?.trim() || "-" },
    { kind: "center", text: data.phone?.trim() || "-" },
    { kind: "line" },
    { kind: "pair", left: "Invoice", right: data.noNota },
    { kind: "pair", left: "Tanggal", right: formatDateTime(data.tglBayar) },
    { kind: "pair", left: "Sales", right: data.adminNama?.trim() || "-" },
    { kind: "line" },
    { kind: "pair", left: "Jenis", right: data.jenisLayanan?.trim() || "-" },
    { kind: "pair", left: "Nama Paket", right: data.paketNama?.trim() || "-" },
  ];

  if (periods.length === 0) {
    rows.push({ kind: "pair", left: "Tagihan", right: "-" });
  } else {
    periods.forEach((p, i) => {
      rows.push({ kind: "pair", left: i === 0 ? "Tagihan" : "", right: p });
    });
  }

  rows.push(
    { kind: "pair", left: "Total", right: formatMoney(data.total) },
    {
      kind: "pair",
      left: data.metodeBayar?.trim() || "Tunai",
      right: data.operatorLabel?.trim() || "-",
    },
    { kind: "line" },
    { kind: "pair", left: "Nama Lengkap", right: data.pelangganNama },
    { kind: "pair", left: "Nama Pengguna", right: data.username?.trim() || "-" },
    { kind: "pair", left: "Kata Sandi", right: "**********" },
    {
      kind: "pair",
      left: "Dibuat pada",
      right: formatDateTime(data.dibuatPada ?? data.tglBayar),
    },
    {
      kind: "pair",
      left: "Kedaluwarsa pada",
      right: formatDateTime(data.kedaluwarsaPada),
    },
    { kind: "line" },
    {
      kind: "center",
      text: (data.footerNote?.trim() || "TERIMA KASIH").toUpperCase(),
    }
  );

  return rows;
}

/** Teks fixed-width untuk tampilan UI. */
export function buildNotaPlainText(data: NotaDocumentData): string {
  return buildNotaRows(data)
    .map((row) => {
      if (row.kind === "line") return notaPadLine("=");
      if (row.kind === "center") return notaPadCenter(row.text);
      return notaPads(row.left, row.right);
    })
    .join("\n");
}

/** HTML baris tabel — alignment stabil saat print (tidak andalkan spasi monospace). */
function buildRowsHtml(rows: NotaRow[]): string {
  return rows
    .map((row) => {
      if (row.kind === "line") {
        return `<tr><td colspan="2" class="line"><hr /></td></tr>`;
      }
      if (row.kind === "center") {
        return `<tr><td colspan="2" class="center">${esc(row.text)}</td></tr>`;
      }
      return `<tr><td class="left">${esc(row.left)}</td><td class="right">${esc(row.right)}</td></tr>`;
    })
    .join("");
}

function buildBodyHtml(data: NotaDocumentData, origin: string): string {
  const logo = resolveLogoUrl(data.logoUrl, origin);
  const logoImg = logo
    ? `<img src="${esc(logo)}" alt="" width="36" height="36" crossorigin="anonymous" />`
    : "";
  const rowsHtml = buildRowsHtml(buildNotaRows(data));

  return `
<article id="nota-print">
  <header class="brand">
    ${logoImg}
    <h1>${esc(data.namaUsaha)}</h1>
  </header>
  <table class="nota-table" cellspacing="0" cellpadding="0">
    <tbody>${rowsHtml}</tbody>
  </table>
</article>`;
}

/** Dokumen cetak — layout tabel + Courier New. */
export function buildNotaPrintDocument(data: NotaDocumentData, origin: string, title?: string): string {
  const docTitle = esc(title ?? `Nota ${data.noNota}`);
  const body = buildBodyHtml(data, origin);
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Courier New", Courier, monospace;
    }
    body {
      padding: 12px;
      text-align: center;
    }
    #nota-print {
      display: inline-block;
      width: 280px;
      max-width: 100%;
      margin: 0 auto;
      padding: 12px 10px;
      border: 1px solid #0f172a;
      background: #fff;
      color: #0f172a;
      text-align: left;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 0 0 8px;
      text-align: center;
    }
    .brand img {
      width: 36px;
      height: 36px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand h1 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
      word-break: break-word;
    }
    .nota-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
      line-height: 1.4;
    }
    .nota-table td {
      vertical-align: top;
      padding: 1px 0;
      font-family: "Courier New", Courier, monospace;
    }
    .nota-table td.left {
      text-align: left;
      width: 48%;
      padding-right: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nota-table td.right {
      text-align: right;
      width: 52%;
      word-break: break-word;
    }
    .nota-table td.center {
      text-align: center;
      white-space: normal;
    }
    .nota-table td.line {
      padding: 4px 0;
    }
    .nota-table td.line hr {
      margin: 0;
      border: 0;
      border-top: 1px solid #0f172a;
    }
    @page { margin: 10mm; }
    @media print {
      body { padding: 8px !important; }
      #nota-print {
        margin: 0 auto !important;
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export function buildNotaPrintFragment(data: NotaDocumentData, origin: string): string {
  return buildBodyHtml(data, origin);
}

export function notaPdfFilename(noNota: string): string {
  const safe = noNota.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `Nota-${safe}.pdf`;
}
