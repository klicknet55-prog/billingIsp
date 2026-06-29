import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, paketInternet, pelanggan, routers, tagihan } from "@/lib/db/schema";
import { toIsoDate, toIsoDateTime } from "@/lib/api/query";

function pelangganStatus(row: { isIsolated: boolean }) {
  return row.isIsolated ? "isolated" : "active";
}

export function serializePelanggan(
  row: typeof pelanggan.$inferSelect,
  paketNama?: string | null
) {
  return {
    id: row.id,
    nama: row.nama,
    noWa: row.noWa,
    status: pelangganStatus(row),
    connectionType: row.connectionType,
    alamat: row.alamat,
    paket: paketNama ?? null,
    paketInternetId: row.paketInternetId,
    routerId: row.routerId,
    tglDaftar: toIsoDate(row.tglDaftar ?? row.createdAt),
    tglJatuhTempo: toIsoDate(row.tglJatuhTempo),
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: toIsoDateTime(row.createdAt),
  };
}

export async function listPelangganForApi(
  tenantId: string,
  opts: { offset: number; limit: number; status?: string | null; q?: string | null }
) {
  const filters = [eq(pelanggan.tenantId, tenantId)];

  if (opts.status === "active") filters.push(eq(pelanggan.isIsolated, false));
  if (opts.status === "isolated") filters.push(eq(pelanggan.isIsolated, true));

  const q = opts.q?.trim();
  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    filters.push(
      or(
        sql`lower(${pelanggan.nama}) like ${pattern}`,
        sql`lower(${pelanggan.noWa}) like ${pattern}`
      )!
    );
  }

  const where = and(...filters);

  const [rows, totalRow] = await Promise.all([
    db.query.pelanggan.findMany({
      where,
      orderBy: [desc(pelanggan.createdAt)],
      limit: opts.limit,
      offset: opts.offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(pelanggan).where(where),
  ]);

  const paketIds = [...new Set(rows.map((r) => r.paketInternetId).filter(Boolean))] as string[];
  const paketMap = new Map<string, string>();
  if (paketIds.length > 0) {
    const pakets = await db.query.paketInternet.findMany({
      where: and(eq(paketInternet.tenantId, tenantId)),
      columns: { id: true, nama: true },
    });
    for (const p of pakets) paketMap.set(p.id, p.nama);
  }

  return {
    data: rows.map((r) => serializePelanggan(r, r.paketInternetId ? paketMap.get(r.paketInternetId) : null)),
    total: Number(totalRow[0]?.count ?? 0),
  };
}

export async function getPelangganForApi(tenantId: string, id: string) {
  const row = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)),
  });
  if (!row) return null;

  let paketNama: string | null = null;
  if (row.paketInternetId) {
    const paket = await db.query.paketInternet.findFirst({
      where: and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, row.paketInternetId)),
      columns: { nama: true },
    });
    paketNama = paket?.nama ?? null;
  }

  return serializePelanggan(row, paketNama);
}

export function serializeTagihan(row: typeof tagihan.$inferSelect) {
  return {
    id: row.id,
    pelangganId: row.pelangganId,
    periode: row.periode,
    amount: row.amount,
    dueDate: toIsoDate(row.dueDate),
    kind: row.kind,
    status: row.status,
    receiptId: row.receiptId,
    paidAt: toIsoDateTime(row.paidAt),
    metodeBayar: row.metodeBayar,
    createdAt: toIsoDateTime(row.createdAt),
  };
}

export async function listTagihanForApi(
  tenantId: string,
  opts: {
    offset: number;
    limit: number;
    status?: string | null;
    pelangganId?: string | null;
    periode?: string | null;
  }
) {
  const filters = [eq(tagihan.tenantId, tenantId)];
  if (opts.status) filters.push(eq(tagihan.status, opts.status as typeof tagihan.$inferSelect.status));
  if (opts.pelangganId) filters.push(eq(tagihan.pelangganId, opts.pelangganId));
  if (opts.periode) filters.push(eq(tagihan.periode, opts.periode));

  const where = and(...filters);
  const [rows, totalRow] = await Promise.all([
    db.query.tagihan.findMany({
      where,
      orderBy: [desc(tagihan.createdAt)],
      limit: opts.limit,
      offset: opts.offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(tagihan).where(where),
  ]);

  return { data: rows.map(serializeTagihan), total: Number(totalRow[0]?.count ?? 0) };
}

export async function getTagihanForApi(tenantId: string, id: string) {
  const row = await db.query.tagihan.findFirst({
    where: and(eq(tagihan.tenantId, tenantId), eq(tagihan.id, id)),
  });
  return row ? serializeTagihan(row) : null;
}

export function serializeInvoice(row: typeof invoices.$inferSelect) {
  return {
    id: row.id,
    pelangganId: row.pelangganId,
    noInvoice: row.noInvoice,
    totalTagihan: row.totalTagihan,
    status: row.status,
    lineItems: row.lineItems,
    tglJatuhTempo: toIsoDate(row.tglJatuhTempo),
    tglLunas: toIsoDateTime(row.tglLunas),
    metodeBayar: row.metodeBayar,
    createdAt: toIsoDateTime(row.createdAt),
  };
}

export async function listInvoicesForApi(
  tenantId: string,
  opts: {
    offset: number;
    limit: number;
    status?: string | null;
    pelangganId?: string | null;
  }
) {
  const filters = [eq(invoices.tenantId, tenantId)];
  if (opts.status) filters.push(eq(invoices.status, opts.status as typeof invoices.$inferSelect.status));
  if (opts.pelangganId) filters.push(eq(invoices.pelangganId, opts.pelangganId));

  const where = and(...filters);
  const [rows, totalRow] = await Promise.all([
    db.query.invoices.findMany({
      where,
      orderBy: [desc(invoices.createdAt)],
      limit: opts.limit,
      offset: opts.offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(invoices).where(where),
  ]);

  return { data: rows.map(serializeInvoice), total: Number(totalRow[0]?.count ?? 0) };
}

export function serializeRouter(row: typeof routers.$inferSelect) {
  return {
    id: row.id,
    nama: row.nama,
    connectionMode: row.connectionMode,
    ipAddress: row.ipAddress,
    apiPort: row.apiPort,
    username: row.username,
    isOnline: row.isOnline,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: toIsoDateTime(row.createdAt),
  };
}

export async function listRoutersForApi(tenantId: string) {
  const rows = await db.query.routers.findMany({
    where: eq(routers.tenantId, tenantId),
    orderBy: [desc(routers.createdAt)],
  });
  return rows.map(serializeRouter);
}
