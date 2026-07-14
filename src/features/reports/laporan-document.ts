import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  kategoriPengeluaran,
  paketInternet,
  pelanggan,
  pengeluaran,
  routers,
  tenants,
} from "@/lib/db/schema";
import { formatDate, formatRupiah } from "@/lib/utils";

export type LaporanDateRange = {
  from: Date;
  to: Date;
  fromLabel: string;
  toLabel: string;
  /** YYYY-MM — periode bulanan aktif (untuk dropdown) */
  period: string;
  /** YYYY-MM-DD untuk input tanggal custom */
  fromStr: string;
  toStr: string;
  /** Sumber filter aktif */
  mode: "period" | "custom";
};

export type LaporanHeader = {
  namaUsaha: string;
  alamat: string;
  phone: string;
};

export type LaporanTransaksiRow = {
  pelangganNama: string;
  paketNama: string;
  harga: number;
  tglBayar: Date | null;
  metodeBayar: string;
  routerNama: string;
};

export type LaporanPengeluaranRow = {
  keperluan: string;
  biaya: number;
  tanggal: Date;
};

export type LaporanKeuangan = {
  header: LaporanHeader;
  range: LaporanDateRange;
  transaksi: LaporanTransaksiRow[];
  pengeluaran: LaporanPengeluaranRow[];
  jumlahPemasukan: number;
  jumlahPengeluaran: number;
  totalKeuntungan: number;
};

/** Parse YYYY-MM-DD → awal/akhir hari lokal untuk filter laporan. */
export function parseLaporanRange(fromRaw: string | null, toRaw: string | null): LaporanDateRange {
  const period = defaultLaporanPeriod();
  const defaults = rangeFromPeriod(period);
  const fromStr = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw ?? "") ? fromRaw! : defaults.fromStr;
  const toStr = /^\d{4}-\d{2}-\d{2}$/.test(toRaw ?? "") ? toRaw! : defaults.toStr;

  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T23:59:59.999`);
  if (from > to) {
    return parseLaporanRange(toStr, fromStr);
  }

  const periodKey = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`;

  return {
    from,
    to,
    fromLabel: formatDate(from),
    toLabel: formatDate(to),
    period: periodKey,
    fromStr,
    toStr,
    mode: "custom",
  };
}

/** Periode default: bulan berjalan (YYYY-MM). */
export function defaultLaporanPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function rangeFromPeriod(period: string): { fromStr: string; toStr: string } {
  const [ys, ms] = period.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    fromStr: `${y}-${mm}-01`,
    toStr: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** Parse periode bulanan YYYY-MM (default bulan ini). */
export function parseLaporanPeriod(periodRaw: string | null | undefined): LaporanDateRange {
  const period =
    /^\d{4}-\d{2}$/.test(periodRaw ?? "") ? periodRaw! : defaultLaporanPeriod();
  const { fromStr, toStr } = rangeFromPeriod(period);
  const from = new Date(`${fromStr}T00:00:00`);
  const to = new Date(`${toStr}T23:59:59.999`);
  return {
    from,
    to,
    fromLabel: formatDate(from),
    toLabel: formatDate(to),
    period,
    fromStr,
    toStr,
    mode: "period",
  };
}

/** Resolve range: `from`+`to` = custom; selain itu pakai `period` (default bulan ini). */
export function resolveLaporanRange(params: {
  period?: string | null;
  from?: string | null;
  to?: string | null;
}): LaporanDateRange {
  const hasCustom =
    /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "");
  if (hasCustom) {
    return parseLaporanRange(params.from!, params.to!);
  }
  return parseLaporanPeriod(params.period);
}

export function defaultLaporanRangeQuery(): { from: string; to: string; period: string } {
  const period = defaultLaporanPeriod();
  const { fromStr, toStr } = rangeFromPeriod(period);
  return { from: fromStr, to: toStr, period };
}

/** Opsi filter periode: 12 bulan belakangan + bulan ini. */
export function listLaporanPeriodOptions(count = 12): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(d);
    options.push({ value, label });
  }
  return options;
}

async function getLaporanHeader(tenantId: string): Promise<LaporanHeader> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  return {
    namaUsaha: tenant?.namaUsaha?.trim() || "ISP",
    alamat: tenant?.alamat?.trim() || "-",
    phone: tenant?.phone?.trim() || "-",
  };
}

export async function getLaporanKeuangan(
  tenantId: string,
  range: LaporanDateRange
): Promise<LaporanKeuangan> {
  const [header, transaksiRows, spendRows] = await Promise.all([
    getLaporanHeader(tenantId),
    db
      .select({
        pelangganNama: pelanggan.nama,
        paketNama: paketInternet.nama,
        harga: invoices.totalTagihan,
        tglBayar: invoices.tglLunas,
        metodeBayar: invoices.metodeBayar,
        routerNama: routers.nama,
        lineItems: invoices.lineItems,
      })
      .from(invoices)
      .innerJoin(pelanggan, eq(invoices.pelangganId, pelanggan.id))
      .leftJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
      .leftJoin(routers, eq(pelanggan.routerId, routers.id))
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, "paid"),
          gte(invoices.tglLunas, range.from),
          lte(invoices.tglLunas, range.to)
        )
      )
      .orderBy(desc(invoices.tglLunas)),
    db
      .select({
        p: pengeluaran,
        kategoriNama: kategoriPengeluaran.nama,
      })
      .from(pengeluaran)
      .leftJoin(kategoriPengeluaran, eq(pengeluaran.kategoriId, kategoriPengeluaran.id))
      .where(
        and(
          eq(pengeluaran.tenantId, tenantId),
          gte(pengeluaran.tanggal, range.from),
          lte(pengeluaran.tanggal, range.to)
        )
      )
      .orderBy(desc(pengeluaran.tanggal)),
  ]);

  const transaksi: LaporanTransaksiRow[] = transaksiRows.map((r) => {
    const fromLines =
      r.lineItems && r.lineItems.length > 0
        ? r.lineItems.map((li) => li.label).filter(Boolean).join(", ")
        : "";
    return {
      pelangganNama: r.pelangganNama,
      paketNama: r.paketNama?.trim() || fromLines || "-",
      harga: r.harga ?? 0,
      tglBayar: r.tglBayar,
      metodeBayar: r.metodeBayar?.trim() || "-",
      routerNama: r.routerNama?.trim() || "-",
    };
  });

  const pengeluaranList: LaporanPengeluaranRow[] = spendRows.map((r) => ({
    keperluan: [r.kategoriNama ?? "Umum", r.p.catatan?.trim()].filter(Boolean).join(" — ") || "Umum",
    biaya: r.p.jumlah,
    tanggal: r.p.tanggal,
  }));

  const jumlahPemasukan = transaksi.reduce((s, r) => s + r.harga, 0);
  const jumlahPengeluaran = pengeluaranList.reduce((s, r) => s + r.biaya, 0);

  return {
    header,
    range,
    transaksi,
    pengeluaran: pengeluaranList,
    jumlahPemasukan,
    jumlahPengeluaran,
    totalKeuntungan: jumlahPemasukan - jumlahPengeluaran,
  };
}

export function formatLaporanMoney(value: number): string {
  return formatRupiah(value);
}

/** Judul periode singkat untuk header laporan. */
export function laporanPeriodTitle(range: LaporanDateRange): string {
  return `Laporan Transaksi tanggal ${range.fromLabel} - ${range.toLabel}`;
}
