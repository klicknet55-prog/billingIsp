import { and, eq } from "drizzle-orm";
import { buildNotaDocumentForReceipt } from "@/features/billing/nota-document-builder";
import {
  getLaporanKeuangan,
  laporanPeriodTitle,
  resolveLaporanRange,
} from "@/features/reports/laporan-document";
import { buildLaporanPdfBuffer } from "@/features/reports/laporan-pdf";
import {
  verifyDownloadTicket,
  type LaporanDownloadClaims,
  type NotaDownloadClaims,
} from "@/lib/download/signed-download-ticket";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { buildNotaPdfBuffer } from "@/lib/print/nota-pdf-server";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { formatDate, formatRupiah } from "@/lib/utils";
import * as XLSX from "xlsx";

/**
 * Unduh file via tiket bertanda tangan — tidak butuh cookie session.
 * Dipakai Custom Tab / browser bawaan dari APK.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t")?.trim();
  if (!token) {
    return new Response("Token unduhan wajib.", { status: 400 });
  }

  const claims = verifyDownloadTicket(token);
  if (!claims) {
    return new Response(
      "Link unduhan tidak valid atau sudah kedaluwarsa. Kembali ke app lalu coba lagi.",
      { status: 401 }
    );
  }

  try {
    if (claims.kind === "laporan") {
      return await serveLaporan(claims);
    }
    return await serveNota(claims);
  } catch (err) {
    console.error("download/file failed", err);
    return new Response("Gagal menyiapkan file unduhan.", { status: 500 });
  }
}

async function serveLaporan(claims: LaporanDownloadClaims) {
  const range = resolveLaporanRange({
    period: claims.period ?? null,
    from: claims.from ?? null,
    to: claims.to ?? null,
  });
  const data = await getLaporanKeuangan(claims.tid, range);
  const basename = `laporan-${range.from.toISOString().slice(0, 10)}_${range.to.toISOString().slice(0, 10)}`;

  if (claims.format === "pdf") {
    const buffer = buildLaporanPdfBuffer(data);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${basename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const title = laporanPeriodTitle(data.range);
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
    [],
    ["Tabel Pengeluaran"],
    ["Keperluan", "Biaya", "Tanggal"],
    ...data.pengeluaran.map((r) => [r.keperluan, formatRupiah(r.biaya), formatDate(r.tanggal)]),
    [],
    ["Jumlah Pemasukan", formatRupiah(data.jumlahPemasukan)],
    ["Jumlah pengeluaran", formatRupiah(data.jumlahPengeluaran)],
    ["Total Keuntungan", formatRupiah(data.totalKeuntungan)],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
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

async function serveNota(claims: NotaDownloadClaims) {
  const tenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.id, claims.tid)),
  });

  const notaData = await buildNotaDocumentForReceipt({
    tenantId: claims.tid,
    receiptId: claims.rid,
    tenant: {
      namaUsaha: tenant?.namaUsaha ?? DEFAULT_BRAND_NAME,
      logoUrl: tenant?.logoUrl,
      alamat: tenant?.alamat,
      phone: tenant?.phone,
    },
  });
  if (!notaData) {
    return new Response("Nota tidak ditemukan.", { status: 404 });
  }

  const { buffer, filename } = await buildNotaPdfBuffer(notaData);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
