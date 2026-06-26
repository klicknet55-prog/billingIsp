#!/usr/bin/env tsx
/**
 * Migrasi invoice unpaid/overdue lama → baris tagihan.
 * Invoice paid (nota historis) tidak diubah.
 *
 * Usage: npm run db:migrate-tagihan [-- --dry-run]
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { invoices, pelanggan, tagihan } from "../src/lib/db/schema";
import { newId } from "../src/lib/utils";

const dryRun = process.argv.includes("--dry-run");

function periodeFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const legacy = await db.query.invoices.findMany({
  where: inArray(invoices.status, ["unpaid", "overdue"]),
});

let created = 0;
let skipped = 0;
let removed = 0;

for (const inv of legacy) {
  const due = inv.tglJatuhTempo ?? inv.createdAt;
  const periode = periodeFromDate(due);
  const existing = await db.query.tagihan.findFirst({
    where: and(
      eq(tagihan.tenantId, inv.tenantId),
      eq(tagihan.pelangganId, inv.pelangganId),
      eq(tagihan.periode, periode)
    ),
  });
  if (existing) {
    skipped++;
    if (!dryRun) {
      await db.delete(invoices).where(eq(invoices.id, inv.id));
      removed++;
    }
    continue;
  }

  const status = inv.status === "overdue" ? "tunggakan" : "open";
  const tagihanId = newId("tgh");

  if (!dryRun) {
    await db.insert(tagihan).values({
      id: tagihanId,
      tenantId: inv.tenantId,
      pelangganId: inv.pelangganId,
      periode,
      amount: inv.totalTagihan,
      dueDate: due,
      kind: "recurring",
      status,
      preDueRemindedAt: inv.preDueRemindedAt,
    });
    await db.delete(invoices).where(eq(invoices.id, inv.id));
  }
  created++;
  removed++;
}

const nullTglDaftar = await db.query.pelanggan.findMany({
  columns: { id: true, tenantId: true, createdAt: true, tglDaftar: true },
});
let backfill = 0;
for (const p of nullTglDaftar) {
  if (p.tglDaftar) continue;
  if (!dryRun) {
    await db
      .update(pelanggan)
      .set({ tglDaftar: p.createdAt })
      .where(and(eq(pelanggan.tenantId, p.tenantId), eq(pelanggan.id, p.id)));
  }
  backfill++;
}

console.log(
  dryRun
    ? `[dry-run] ${legacy.length} invoice legacy, ${created} tagihan baru, ${skipped} sudah ada, ${backfill} tgl_daftar backfill`
    : `Selesai — ${created} tagihan dibuat, ${skipped} dilewati (tagihan ada), ${removed} invoice legacy dihapus, ${backfill} tgl_daftar backfill`
);
