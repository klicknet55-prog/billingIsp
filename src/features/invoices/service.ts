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

export async function createInvoice(
  tenantId: string,
  input: InvoiceInput,
  createdBy: string
) {
  const count = await db.$count(invoices, eq(invoices.tenantId, tenantId));
  await db.insert(invoices).values({
    id: newId("inv"),
    tenantId,
    pelangganId: input.pelangganId,
    noInvoice: `INV-${String(count + 1).padStart(4, "0")}`,
    totalTagihan: input.totalTagihan,
    status: "unpaid",
    tglJatuhTempo: input.tglJatuhTempo ?? null,
    createdBy,
  });
}

/**
 * Tandai invoice lunas, catat metode & log pembayaran, lalu aktifkan kembali
 * koneksi pelanggan (jika terisolir) via Mikrotik.
 */
export async function markInvoicePaid(
  tenantId: string,
  invoiceId: string,
  metode: string
) {
  const inv = await getInvoice(tenantId, invoiceId);
  if (!inv || inv.status === "paid") return;

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
  log.info(`Invoice ${invoiceId} lunas via ${metode}`);
}
