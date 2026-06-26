import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { paketInternet, pelanggan, tagihan } from "@/lib/db/schema";
import {
  addMonths,
  isPastDue,
  resolveActiveBillingPeriod,
  startOfDay,
} from "@/features/jobs/due-date";
import { setIsolasi } from "@/features/customers/service";
import { FIRST_INVOICE_DAYS, shouldGenerateInvoice } from "@/features/jobs/billing";
import { newId } from "@/lib/utils";

export type PaymentSelection = "bulan_ini" | "tunggakan" | "keduanya";

export interface TagihanSummary {
  bulanIni: typeof tagihan.$inferSelect | null;
  tunggakan: (typeof tagihan.$inferSelect)[];
  totalTunggakan: number;
  hasBulanIni: boolean;
  activePeriode: string;
  activeDueDate: Date;
}

export type TagihanPelangganStatus =
  | "open"
  | "tunggakan"
  | "not_due"
  | "clear";

export interface TagihanPelangganRow {
  pelangganId: string;
  nama: string;
  noWa: string;
  paketNama: string | null;
  tglJatuhTempo: Date | null;
  activePeriode: string;
  activeDueDate: Date;
  bulanIni: typeof tagihan.$inferSelect | null;
  tunggakanTotal: number;
  tunggakanCount: number;
  status: TagihanPelangganStatus;
  isIsolated: boolean;
  canCatatNunggak: boolean;
}

export async function getTagihanForPelanggan(tenantId: string, pelangganId: string) {
  return db.query.tagihan.findMany({
    where: and(eq(tagihan.tenantId, tenantId), eq(tagihan.pelangganId, pelangganId)),
    orderBy: [desc(tagihan.periode)],
  });
}

export async function getTagihanSummary(
  tenantId: string,
  pelangganId: string
): Promise<TagihanSummary> {
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)),
  });
  if (!cust) {
    return {
      bulanIni: null,
      tunggakan: [],
      totalTunggakan: 0,
      hasBulanIni: false,
      activePeriode: "",
      activeDueDate: new Date(),
    };
  }

  const { periode, dueDate: activeDueDate } = resolveActiveBillingPeriod(
    cust.tglDaftar ?? cust.createdAt,
    cust.tglJatuhTempo
  );

  const rows = await db.query.tagihan.findMany({
    where: and(
      eq(tagihan.tenantId, tenantId),
      eq(tagihan.pelangganId, pelangganId),
      inArray(tagihan.status, ["open", "tunggakan"])
    ),
    orderBy: [desc(tagihan.periode)],
  });

  const bulanIni =
    rows
      .filter((r) => r.status === "open")
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] ?? null;
  const tunggakan = rows
    .filter((r) => r.status === "tunggakan")
    .sort((a, b) => a.periode.localeCompare(b.periode));
  const totalTunggakan = tunggakan.reduce((s, r) => s + r.amount, 0);

  return {
    bulanIni,
    tunggakan,
    totalTunggakan,
    hasBulanIni: !!bulanIni,
    activePeriode: periode,
    activeDueDate,
  };
}

export function resolvePayableTagihan(
  summary: TagihanSummary,
  selection: PaymentSelection
): (typeof tagihan.$inferSelect)[] {
  switch (selection) {
    case "bulan_ini":
      return summary.bulanIni ? [summary.bulanIni] : [];
    case "tunggakan":
      return summary.tunggakan;
    case "keduanya": {
      const ids = new Set<string>();
      const items: (typeof tagihan.$inferSelect)[] = [];
      for (const t of [...(summary.bulanIni ? [summary.bulanIni] : []), ...summary.tunggakan]) {
        if (!ids.has(t.id)) {
          ids.add(t.id);
          items.push(t);
        }
      }
      return items;
    }
  }
}

export async function hasAnyOutstanding(tenantId: string, pelangganId: string) {
  const summary = await getTagihanSummary(tenantId, pelangganId);
  return summary.hasBulanIni || summary.tunggakan.length > 0;
}

/** Buat tagihan periode jika belum ada (dipanggil cron / halaman tagihan). */
export async function ensureTagihanForCustomer(
  tenantId: string,
  pelangganId: string,
  hargaBulanan: number,
  now: Date = new Date()
): Promise<typeof tagihan.$inferSelect | null> {
  if (hargaBulanan <= 0) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const cust = await db.query.pelanggan.findFirst({
      where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)),
    });
    if (!cust) return null;

    const tglDaftar = cust.tglDaftar ?? cust.createdAt;
    const { periode, dueDate } = resolveActiveBillingPeriod(tglDaftar, cust.tglJatuhTempo, now);

    const existing = await db.query.tagihan.findFirst({
      where: and(
        eq(tagihan.tenantId, tenantId),
        eq(tagihan.pelangganId, pelangganId),
        eq(tagihan.periode, periode)
      ),
    });

    if (existing) {
      if (existing.status === "paid" && attempt === 0) {
        await advancePelangganDueDate(tenantId, pelangganId);
        continue;
      }
      return existing.status === "paid" ? null : existing;
    }

    const priorCount = await db.$count(
      tagihan,
      and(eq(tagihan.tenantId, tenantId), eq(tagihan.pelangganId, pelangganId))
    );

    const pastDue = isPastDue(dueDate, now);

    if (priorCount === 0) {
      if (!pastDue) {
        const graceEnd = new Date(tglDaftar.getTime() + FIRST_INVOICE_DAYS * 24 * 60 * 60 * 1000);
        if (startOfDay(now) < startOfDay(graceEnd)) return null;
      }
    } else if (!shouldGenerateInvoice(now, dueDate) && !pastDue) {
      return null;
    }

    const id = newId("tgh");
    await db.insert(tagihan).values({
      id,
      tenantId,
      pelangganId,
      periode,
      amount: hargaBulanan,
      dueDate,
      kind: priorCount === 0 ? "first" : "recurring",
      status: "open",
    });

    return (await db.query.tagihan.findFirst({ where: eq(tagihan.id, id) })) ?? null;
  }

  return null;
}

/** Tandai tagihan lewat jatuh tempo sebagai tunggakan (manual admin — lihat catatNunggakPelanggan). */
export async function markOverdueTagihan(now: Date = new Date()) {
  const today = startOfDay(now);
  const rows = await db.query.tagihan.findMany({
    where: eq(tagihan.status, "open"),
  });
  let count = 0;
  for (const row of rows) {
    if (startOfDay(row.dueDate) < today) {
      await db.update(tagihan).set({ status: "tunggakan" }).where(eq(tagihan.id, row.id));
      count++;
    }
  }
  return count;
}

/**
 * Isolir pelanggan yang lewat jatuh tempo dan belum lunas.
 * Termasuk jika baris tagihan belum sempat dibuat (akan dibuat saat sync).
 */
export async function isolateOverdueUnpaid(
  tenantId?: string,
  now: Date = new Date()
): Promise<number> {
  const today = startOfDay(now);
  let count = 0;

  const openRows = await db.query.tagihan.findMany({
    where: tenantId
      ? and(eq(tagihan.tenantId, tenantId), eq(tagihan.status, "open"))
      : eq(tagihan.status, "open"),
  });

  const fromTagihan = new Map<string, { tenantId: string; pelangganId: string }>();
  for (const row of openRows) {
    if (startOfDay(row.dueDate) < today) {
      fromTagihan.set(`${row.tenantId}:${row.pelangganId}`, {
        tenantId: row.tenantId,
        pelangganId: row.pelangganId,
      });
    }
  }

  for (const { tenantId: tid, pelangganId } of fromTagihan.values()) {
    const cust = await db.query.pelanggan.findFirst({
      where: and(eq(pelanggan.tenantId, tid), eq(pelanggan.id, pelangganId)),
    });
    if (cust && !cust.isIsolated) {
      await setIsolasi(tid, pelangganId, true);
      count++;
    }
  }

  const customers = tenantId
    ? await db.query.pelanggan.findMany({ where: eq(pelanggan.tenantId, tenantId) })
    : await db.query.pelanggan.findMany();

  for (const cust of customers) {
    if (!cust.tglJatuhTempo || cust.isIsolated) continue;
    if (startOfDay(cust.tglJatuhTempo) >= today) continue;

    const tglDaftar = cust.tglDaftar ?? cust.createdAt;
    const { periode } = resolveActiveBillingPeriod(tglDaftar, cust.tglJatuhTempo, now);
    const paid = await db.query.tagihan.findFirst({
      where: and(
        eq(tagihan.tenantId, cust.tenantId),
        eq(tagihan.pelangganId, cust.id),
        eq(tagihan.periode, periode),
        eq(tagihan.status, "paid")
      ),
    });
    if (!paid) {
      await setIsolasi(cust.tenantId, cust.id, true);
      count++;
    }
  }

  return count;
}

/** Catat tagihan open lewat jatuh tempo sebagai tunggakan, majukan jatuh tempo, buka isolir. */
export async function catatNunggakPelanggan(
  tenantId: string,
  pelangganId: string,
  now: Date = new Date()
): Promise<{ converted: number }> {
  const harga = await getPaketHarga(tenantId, pelangganId);
  if (harga > 0) {
    await ensureTagihanForCustomer(tenantId, pelangganId, harga, now);
  }

  const today = startOfDay(now);
  const openRows = await db.query.tagihan.findMany({
    where: and(
      eq(tagihan.tenantId, tenantId),
      eq(tagihan.pelangganId, pelangganId),
      eq(tagihan.status, "open")
    ),
  });

  let converted = 0;
  for (const row of openRows) {
    if (startOfDay(row.dueDate) < today) {
      await db.update(tagihan).set({ status: "tunggakan" }).where(eq(tagihan.id, row.id));
      converted++;
    }
  }

  if (converted > 0) {
    await advancePelangganDueDate(tenantId, pelangganId);
  }

  await setIsolasi(tenantId, pelangganId, false);
  return { converted };
}

export async function canCatatNunggak(
  tenantId: string,
  pelangganId: string,
  now: Date = new Date()
): Promise<boolean> {
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)),
  });
  if (!cust) return false;

  const tglDaftar = cust.tglDaftar ?? cust.createdAt;
  const { dueDate } = resolveActiveBillingPeriod(tglDaftar, cust.tglJatuhTempo, now);
  if (!isPastDue(dueDate, now)) return false;

  const harga = await getPaketHarga(tenantId, pelangganId);
  if (harga <= 0) return false;

  const summary = await getTagihanSummary(tenantId, pelangganId);
  const hasOverdueOpen =
    summary.bulanIni && isPastDue(summary.bulanIni.dueDate, now);
  if (hasOverdueOpen) return true;
  if (summary.tunggakan.length > 0) return true;

  const { periode } = resolveActiveBillingPeriod(tglDaftar, cust.tglJatuhTempo, now);
  const paid = await db.query.tagihan.findFirst({
    where: and(
      eq(tagihan.tenantId, tenantId),
      eq(tagihan.pelangganId, pelangganId),
      eq(tagihan.periode, periode),
      eq(tagihan.status, "paid")
    ),
  });
  return !paid;
}

/** Setelah bayar bulan ini, advance jatuh tempo pelanggan. */
export async function advancePelangganDueDate(tenantId: string, pelangganId: string) {
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)),
  });
  if (!cust) return;
  const anchor = cust.tglJatuhTempo ?? cust.tglDaftar ?? cust.createdAt;
  await db
    .update(pelanggan)
    .set({ tglJatuhTempo: addMonths(anchor, 1) })
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)));
}

export async function listOutstandingForKolektor(tenantId: string, kolektorId: string) {
  return db
    .select({
      t: tagihan,
      nama: pelanggan.nama,
      wa: pelanggan.noWa,
      lat: pelanggan.latitude,
      lng: pelanggan.longitude,
      alamat: pelanggan.alamat,
      pelangganId: pelanggan.id,
    })
    .from(tagihan)
    .innerJoin(pelanggan, eq(tagihan.pelangganId, pelanggan.id))
    .where(
      and(
        eq(tagihan.tenantId, tenantId),
        eq(pelanggan.kolektorId, kolektorId),
        inArray(tagihan.status, ["open", "tunggakan"])
      )
    )
    .orderBy(desc(tagihan.periode));
}

export async function getPaketHarga(tenantId: string, pelangganId: string): Promise<number> {
  const row = await db
    .select({ harga: paketInternet.hargaBulanan })
    .from(pelanggan)
    .innerJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)))
    .limit(1);
  return row[0]?.harga ?? 0;
}

function resolvePelangganTagihanStatus(
  summary: Pick<TagihanSummary, "hasBulanIni" | "tunggakan" | "activeDueDate">,
  now: Date,
  isIsolated: boolean
): TagihanPelangganStatus {
  if (summary.tunggakan.length > 0) return "tunggakan";
  if (summary.hasBulanIni) {
    const pastDue = startOfDay(now) > startOfDay(summary.activeDueDate);
    if (pastDue && isIsolated) return "open";
    return "open";
  }
  const inWindow = shouldGenerateInvoice(now, summary.activeDueDate);
  const isPastDue = startOfDay(now) > startOfDay(summary.activeDueDate);
  if (inWindow || isPastDue) return "open";
  return "not_due";
}

/** Sinkronkan tagihan satu pelanggan (buat + isolir jika lewat tempo). */
export async function syncTagihanForPelanggan(
  tenantId: string,
  pelangganId: string,
  now: Date = new Date()
) {
  const harga = await getPaketHarga(tenantId, pelangganId);
  if (harga > 0) {
    await ensureTagihanForCustomer(tenantId, pelangganId, harga, now);
  }
  await isolateOverdueUnpaid(tenantId, now);
}

/** Sinkronkan tagihan tenant (buat yang belum ada + isolir lewat jatuh tempo). */
export async function syncTagihanForTenant(tenantId: string, now: Date = new Date()) {
  const customers = await db
    .select({
      id: pelanggan.id,
      harga: paketInternet.hargaBulanan,
    })
    .from(pelanggan)
    .innerJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
    .where(and(eq(pelanggan.tenantId, tenantId), eq(paketInternet.isActive, true)));

  for (const cust of customers) {
    if (cust.harga <= 0) continue;
    await ensureTagihanForCustomer(tenantId, cust.id, cust.harga, now);
  }

  await isolateOverdueUnpaid(tenantId, now);
}

/** Daftar pelanggan dengan ringkasan tagihan untuk halaman admin. */
export async function listTagihanPelanggan(
  tenantId: string,
  now: Date = new Date()
): Promise<TagihanPelangganRow[]> {
  await syncTagihanForTenant(tenantId, now);

  const [customers, tagihanRows] = await Promise.all([
    db
      .select({
        id: pelanggan.id,
        nama: pelanggan.nama,
        noWa: pelanggan.noWa,
        tglJatuhTempo: pelanggan.tglJatuhTempo,
        tglDaftar: pelanggan.tglDaftar,
        createdAt: pelanggan.createdAt,
        isIsolated: pelanggan.isIsolated,
        paketNama: paketInternet.nama,
      })
      .from(pelanggan)
      .leftJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
      .where(eq(pelanggan.tenantId, tenantId))
      .orderBy(pelanggan.nama),
    db.query.tagihan.findMany({
      where: and(
        eq(tagihan.tenantId, tenantId),
        inArray(tagihan.status, ["open", "tunggakan"])
      ),
    }),
  ]);

  const tagihanByPelanggan = new Map<string, (typeof tagihan.$inferSelect)[]>();
  for (const row of tagihanRows) {
    const list = tagihanByPelanggan.get(row.pelangganId) ?? [];
    list.push(row);
    tagihanByPelanggan.set(row.pelangganId, list);
  }

  const result: TagihanPelangganRow[] = [];
  for (const c of customers) {
    const rows = tagihanByPelanggan.get(c.id) ?? [];
    const { periode: activePeriode, dueDate: activeDueDate } = resolveActiveBillingPeriod(
      c.tglDaftar ?? c.createdAt,
      c.tglJatuhTempo,
      now
    );
    const bulanIni =
      rows
        .filter((r) => r.status === "open")
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0] ?? null;
    const tunggakan = rows
      .filter((r) => r.status === "tunggakan")
      .sort((a, b) => a.periode.localeCompare(b.periode));
    const tunggakanTotal = tunggakan.reduce((s, r) => s + r.amount, 0);
    const summary = {
      hasBulanIni: !!bulanIni,
      tunggakan,
      activeDueDate,
    };
    const status = resolvePelangganTagihanStatus(summary, now, c.isIsolated);
    const canNunggak = await canCatatNunggak(tenantId, c.id, now);

    result.push({
      pelangganId: c.id,
      nama: c.nama,
      noWa: c.noWa,
      paketNama: c.paketNama,
      tglJatuhTempo: c.tglJatuhTempo,
      activePeriode,
      activeDueDate,
      bulanIni,
      tunggakanTotal,
      tunggakanCount: tunggakan.length,
      status,
      isIsolated: c.isIsolated,
      canCatatNunggak: canNunggak,
    });
  }

  return result;
}
