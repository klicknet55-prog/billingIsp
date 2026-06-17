import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  kategoriPengeluaran,
  pengeluaran,
  type Pengeluaran,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils";

export interface FinancialSummary {
  pemasukan: number;
  pengeluaran: number;
  laba: number;
  invoiceLunas: number;
}

export async function getFinancialSummary(tenantId: string): Promise<FinancialSummary> {
  const paid = await db.query.invoices.findMany({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.status, "paid")),
  });
  const spend = await db.query.pengeluaran.findMany({
    where: eq(pengeluaran.tenantId, tenantId),
  });
  const pemasukan = paid.reduce((s, i) => s + i.totalTagihan, 0);
  const totalSpend = spend.reduce((s, p) => s + p.jumlah, 0);
  return {
    pemasukan,
    pengeluaran: totalSpend,
    laba: pemasukan - totalSpend,
    invoiceLunas: paid.length,
  };
}

export interface PengeluaranRow extends Pengeluaran {
  kategoriNama: string | null;
}

export async function listPengeluaran(tenantId: string): Promise<PengeluaranRow[]> {
  const rows = await db
    .select({ p: pengeluaran, kategoriNama: kategoriPengeluaran.nama })
    .from(pengeluaran)
    .leftJoin(kategoriPengeluaran, eq(pengeluaran.kategoriId, kategoriPengeluaran.id))
    .where(eq(pengeluaran.tenantId, tenantId))
    .orderBy(desc(pengeluaran.tanggal));
  return rows.map((r) => ({ ...r.p, kategoriNama: r.kategoriNama }));
}

export function listKategori(tenantId: string) {
  return db.query.kategoriPengeluaran.findMany({
    where: eq(kategoriPengeluaran.tenantId, tenantId),
  });
}

export async function addPengeluaran(
  tenantId: string,
  input: { kategoriId: string | null; jumlah: number; catatan?: string | null }
) {
  await db.insert(pengeluaran).values({
    id: newId("exp"),
    tenantId,
    kategoriId: input.kategoriId || null,
    jumlah: input.jumlah,
    catatan: input.catatan ?? null,
  });
}
