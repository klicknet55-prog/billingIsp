import { formatDate, formatRupiah } from "@/lib/utils";

export type NotaDocumentLineItem = {
  periode: string;
  label: string;
  amount: number;
};

/** Data serializable untuk cetak / unduh PDF nota (client). */
export type NotaDocumentData = {
  namaUsaha: string;
  logoUrl?: string | null;
  noNota: string;
  pelangganNama: string;
  pelangganWa?: string | null;
  pelangganAlamat?: string | null;
  /** ISO string atau null */
  tglBayar: string | null;
  metodeBayar?: string | null;
  lineItems: NotaDocumentLineItem[];
  total: number;
  compactPelanggan?: boolean;
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(value: string | null): string {
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

function resolveLogoUrl(logoUrl: string | null | undefined, origin: string): string | null {
  if (!logoUrl?.trim()) return null;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) return logoUrl;
  return `${origin.replace(/\/$/, "")}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
}

function buildBodyHtml(data: NotaDocumentData, origin: string): string {
  const items =
    data.lineItems.length > 0
      ? data.lineItems
      : [{ periode: "-", label: "Pembayaran tagihan", amount: data.total }];

  const logo = resolveLogoUrl(data.logoUrl, origin);
  const logoBlock = logo
    ? `<img src="${esc(logo)}" alt="" width="48" height="48" style="display:block;margin:0 auto 8px;object-fit:contain;" />`
    : "";

  const pelangganBlock = data.compactPelanggan
    ? `<p style="margin:0;text-align:center;font-size:11px;color:#64748b;">Atas nama <strong style="color:#0f172a;">${esc(data.pelangganNama)}</strong></p>`
    : `<p style="margin:0 0 4px;font-size:11px;color:#64748b;">Pelanggan</p>
       <p style="margin:0 0 2px;font-weight:600;font-size:12px;">${esc(data.pelangganNama)}</p>
       ${data.pelangganWa ? `<p style="margin:0 0 2px;font-size:11px;color:#64748b;">${esc(data.pelangganWa)}</p>` : ""}
       ${data.pelangganAlamat ? `<p style="margin:0;font-size:11px;color:#64748b;line-height:1.4;">${esc(data.pelangganAlamat)}</p>` : ""}`;

  const linesHtml = items
    .map(
      (item) =>
        `<li style="display:flex;justify-content:space-between;gap:12px;margin:0 0 6px;font-size:11px;list-style:none;">
          <span style="flex:1;min-width:0;line-height:1.35;">${esc(item.label)}</span>
          <span style="font-family:ui-monospace,monospace;white-space:nowrap;">${esc(formatRupiah(item.amount))}</span>
        </li>`
    )
    .join("");

  return `
<article id="nota-print" style="box-sizing:border-box;width:100%;max-width:302px;margin:0 auto;padding:20px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
  <header style="text-align:center;margin-bottom:14px;">
    ${logoBlock}
    <h1 style="margin:0 0 4px;font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${esc(data.namaUsaha)}</h1>
    <p style="margin:0 0 8px;font-size:11px;color:#64748b;">Bukti Pembayaran Layanan Internet</p>
    <span style="display:inline-block;padding:2px 10px;border:1px solid #86efac;background:#ecfdf5;color:#15803d;font-size:10px;font-weight:700;letter-spacing:0.12em;border-radius:4px;">LUNAS</span>
  </header>
  <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0;" />
  <dl style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:0;font-size:11px;">
    <dt style="margin:0;color:#64748b;">No. Nota</dt><dd style="margin:0;font-family:ui-monospace,monospace;font-weight:600;">${esc(data.noNota)}</dd>
    <dt style="margin:0;color:#64748b;">Tanggal</dt><dd style="margin:0;">${esc(formatDateTime(data.tglBayar))}</dd>
    <dt style="margin:0;color:#64748b;">Metode</dt><dd style="margin:0;font-weight:500;">${esc(data.metodeBayar ?? "—")}</dd>
  </dl>
  <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0;" />
  <div style="font-size:11px;">${pelangganBlock}</div>
  <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0;" />
  <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#64748b;">Rincian pembayaran</p>
  <ul style="margin:0;padding:0;">${linesHtml}</ul>
  <hr style="border:none;border-top:1px dashed #cbd5e1;margin:12px 0;" />
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;">
    <span>Total dibayar</span>
    <span style="font-family:ui-monospace,monospace;font-size:15px;">${esc(formatRupiah(data.total))}</span>
  </div>
  <footer style="margin-top:14px;text-align:center;font-size:10px;color:#64748b;line-height:1.5;">
    <p style="margin:0;">Terima kasih atas pembayaran Anda.</p>
    <p style="margin:4px 0 0;">Dicetak ${esc(formatDate(new Date()))}</p>
  </footer>
</article>`;
}

/** HTML lengkap dengan CSS inline — tidak bergantung Tailwind / popup stylesheet. */
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
    html, body { margin: 0; padding: 0; background: #fff; color: #111; }
    body { padding: 16px; display: flex; justify-content: center; }
    @page { margin: 10mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>${body}</body>
</html>`;
}

/** Hanya blok nota (untuk render off-screen / canvas). */
export function buildNotaPrintFragment(data: NotaDocumentData, origin: string): string {
  return buildBodyHtml(data, origin);
}

export function notaPdfFilename(noNota: string): string {
  const safe = noNota.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `Nota-${safe}.pdf`;
}
