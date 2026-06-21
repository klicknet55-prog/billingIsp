import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  paymentGatewayLogs,
  pelanggan,
  tenants,
  type Invoice,
} from "@/lib/db/schema";
import { addMonths, sameBillingPeriod } from "@/features/jobs/billing";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";
import { setIsolasi } from "@/features/customers/service";

const log = createLogger("invoices");

export interface InvoiceRow extends Invoice {
  pelangganNama: string;
  pelangganWa: string;
  latitude: number | null;
  longitude: number | null;
  alamat: string | null;
}

async function joinedInvoices(tenantId: string, onlyUnpaid = false, pelangganId?: string) {
  const whereBase = onlyUnpaid
    ? and(eq(invoices.tenantId, tenantId), eq(invoices.status, "unpaid"))
    : eq(invoices.tenantId, tenantId);
  const where = pelangganId
    ? and(whereBase, eq(invoices.pelangganId, pelangganId))
    : whereBase;
  const rows = await db
    .select({
      i: invoices,
      nama: pelanggan.nama,
      wa: pelanggan.noWa,
      lat: pelanggan.latitude,
      lng: pelanggan.longitude,
      alamat: pelanggan.alamat,
    })
    .from(invoices)
    .innerJoin(pelanggan, eq(invoices.pelangganId, pelanggan.id))
    .where(where)
    .orderBy(desc(invoices.createdAt));
  return rows.map<InvoiceRow>((r) => ({
    ...r.i,
    pelangganNama: r.nama,
    pelangganWa: r.wa,
    latitude: r.lat,
    longitude: r.lng,
    alamat: r.alamat,
  }));
}

export function listInvoices(tenantId: string, pelangganId?: string) {
  return joinedInvoices(tenantId, false, pelangganId);
}

export function listUnpaidInvoices(tenantId: string) {
  return joinedInvoices(tenantId, true);
}

/** Tagihan belum lunas untuk pelanggan yang ditugaskan ke kolektor tertentu. */
export async function listUnpaidInvoicesForKolektor(tenantId: string, kolektorId: string) {
  const rows = await db
    .select({
      i: invoices,
      nama: pelanggan.nama,
      wa: pelanggan.noWa,
      lat: pelanggan.latitude,
      lng: pelanggan.longitude,
      alamat: pelanggan.alamat,
    })
    .from(invoices)
    .innerJoin(pelanggan, eq(invoices.pelangganId, pelanggan.id))
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, "unpaid"),
        eq(pelanggan.kolektorId, kolektorId)
      )
    )
    .orderBy(desc(invoices.createdAt));
  return rows.map<InvoiceRow>((r) => ({
    ...r.i,
    pelangganNama: r.nama,
    pelangganWa: r.wa,
    latitude: r.lat,
    longitude: r.lng,
    alamat: r.alamat,
  }));
}

export async function getInvoice(tenantId: string, id: string) {
  return db.query.invoices.findFirst({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)),
  });
}

export interface InvoiceDetail {
  invoice: Invoice;
  pelangganNama: string;
  pelangganWa: string;
  pelangganAlamat: string | null;
  namaUsaha: string;
}

export async function getInvoiceDetail(
  tenantId: string,
  id: string
): Promise<InvoiceDetail | null> {
  const row = await db
    .select({
      i: invoices,
      nama: pelanggan.nama,
      wa: pelanggan.noWa,
      alamat: pelanggan.alamat,
      usaha: tenants.namaUsaha,
    })
    .from(invoices)
    .innerJoin(pelanggan, eq(invoices.pelangganId, pelanggan.id))
    .innerJoin(tenants, eq(invoices.tenantId, tenants.id))
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)))
    .limit(1);
  if (row.length === 0) return null;
  const r = row[0];
  return {
    invoice: r.i,
    pelangganNama: r.nama,
    pelangganWa: r.wa,
    pelangganAlamat: r.alamat,
    namaUsaha: r.usaha,
  };
}

export async function listInvoicesByPelanggan(tenantId: string, pelangganId: string) {
  return db.query.invoices.findMany({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.pelangganId, pelangganId)),
    orderBy: [desc(invoices.createdAt)],
  });
}

export interface InvoiceInput {
  pelangganId: string;
  totalTagihan: number;
  tglJatuhTempo?: Date | null;
}

/** Cek apakah pelanggan sudah punya invoice untuk periode tagihan yang sama. */
export async function hasInvoiceForBillingPeriod(
  tenantId: string,
  pelangganId: string,
  dueDate: Date
): Promise<boolean> {
  const rows = await db.query.invoices.findMany({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.pelangganId, pelangganId)),
    columns: { tglJatuhTempo: true },
  });
  return rows.some(
    (r) => r.tglJatuhTempo && sameBillingPeriod(new Date(r.tglJatuhTempo), dueDate)
  );
}

export async function createInvoice(
  tenantId: string,
  input: InvoiceInput,
  createdBy?: string | null
): Promise<Invoice> {
  const count = await db.$count(invoices, eq(invoices.tenantId, tenantId));
  const id = newId("inv");
  const row: typeof invoices.$inferInsert = {
    id,
    tenantId,
    pelangganId: input.pelangganId,
    noInvoice: `INV-${String(count + 1).padStart(4, "0")}`,
    totalTagihan: input.totalTagihan,
    status: "unpaid",
    tglJatuhTempo: input.tglJatuhTempo ?? null,
    createdBy: createdBy ?? null,
  };
  await db.insert(invoices).values(row);
  const created = await getInvoice(tenantId, id);
  if (!created) throw new Error("Gagal membuat invoice.");
  return created;
}

/** Invoice otomatis dari cron (tanpa user). */
export function createSystemInvoice(tenantId: string, input: InvoiceInput) {
  return createInvoice(tenantId, input, null);
}

/**
 * Tandai invoice lunas, catat metode & log pembayaran, lalu aktifkan kembali
 * koneksi pelanggan (jika terisolir) via Mikrotik.
 */
export async function markInvoicePaid(
  tenantId: string,
  invoiceId: string,
  metode: string,
  opts?: { kolektorUserId?: string }
) {
  const inv = await getInvoice(tenantId, invoiceId);
  if (!inv || inv.status === "paid") return;

  if (opts?.kolektorUserId) {
    const cust = await db.query.pelanggan.findFirst({
      where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, inv.pelangganId)),
    });
    if (!cust || cust.kolektorId !== opts.kolektorUserId) {
      throw new Error("Invoice ini bukan area penagihan Anda.");
    }
  }

  await db
    .update(invoices)
    .set({ status: "paid", tglLunas: new Date(), metodeBayar: metode })
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)));

  await db.insert(paymentGatewayLogs).values({
    id: newId("pgl"),
    tenantId,
    referenceType: "invoice",
    referenceId: invoiceId,
    duitkuOrderId: `INV-${invoiceId}`,
    status: "success",
    amount: inv.totalTagihan,
    paymentMethod: metode,
  });

  // Aktifkan kembali koneksi pelanggan.
  await setIsolasi(tenantId, inv.pelangganId, false);

  const anchor = inv.tglJatuhTempo ?? new Date();
  await db
    .update(pelanggan)
    .set({ tglJatuhTempo: addMonths(anchor, 1) })
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, inv.pelangganId)));

  log.info(`Invoice ${invoiceId} lunas via ${metode}`);
}
