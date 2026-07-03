import { eq, inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db, requireSqlite } from "@/lib/db";
import {
  invoices,
  kategoriPengeluaran,
  odp,
  paketInternet,
  pelanggan,
  pengeluaran,
  receiptTagihanLinks,
  routers,
  tagihan,
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  tenants,
  ticketAssignments,
  tickets,
  users,
} from "@/lib/db/schema";
import { deleteTenantRelatedData } from "@/features/tenants/delete-cascade";
import { serializeRow } from "./serialize";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type TenantBackupCounts,
  type TenantBackupPayload,
} from "./types";

function appVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

export async function exportTenantBackup(tenantId: string): Promise<TenantBackupPayload> {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw new Error("Tenant tidak ditemukan.");

  const [
    tenantUsers,
    tenantRouters,
    tenantPaket,
    tenantOdp,
    tenantPelanggan,
    tenantInvoices,
    tenantTagihan,
    tenantTickets,
    tenantKategori,
    tenantPengeluaran,
    duitkuConfig,
    waConfig,
  ] = await Promise.all([
    db.query.users.findMany({ where: eq(users.tenantId, tenantId) }),
    db.query.routers.findMany({ where: eq(routers.tenantId, tenantId) }),
    db.query.paketInternet.findMany({ where: eq(paketInternet.tenantId, tenantId) }),
    db.query.odp.findMany({ where: eq(odp.tenantId, tenantId) }),
    db.query.pelanggan.findMany({ where: eq(pelanggan.tenantId, tenantId) }),
    db.query.invoices.findMany({ where: eq(invoices.tenantId, tenantId) }),
    db.query.tagihan.findMany({ where: eq(tagihan.tenantId, tenantId) }),
    db.query.tickets.findMany({ where: eq(tickets.tenantId, tenantId) }),
    db.query.kategoriPengeluaran.findMany({ where: eq(kategoriPengeluaran.tenantId, tenantId) }),
    db.query.pengeluaran.findMany({ where: eq(pengeluaran.tenantId, tenantId) }),
    db.query.tenantDuitkuConfigs.findFirst({ where: eq(tenantDuitkuConfigs.tenantId, tenantId) }),
    db.query.tenantWhatsAppConfigs.findFirst({ where: eq(tenantWhatsAppConfigs.tenantId, tenantId) }),
  ]);

  const invoiceIds = tenantInvoices.map((i) => i.id);
  const tagihanIds = tenantTagihan.map((t) => t.id);
  const ticketIds = tenantTickets.map((t) => t.id);

  const [linksByReceipt, linksByTagihan, tenantAssignments] = await Promise.all([
    invoiceIds.length > 0
      ? db.query.receiptTagihanLinks.findMany({
          where: inArray(receiptTagihanLinks.receiptId, invoiceIds),
        })
      : Promise.resolve([]),
    tagihanIds.length > 0
      ? db.query.receiptTagihanLinks.findMany({
          where: inArray(receiptTagihanLinks.tagihanId, tagihanIds),
        })
      : Promise.resolve([]),
    ticketIds.length > 0
      ? db.query.ticketAssignments.findMany({
          where: inArray(ticketAssignments.ticketId, ticketIds),
        })
      : Promise.resolve([]),
  ]);

  const tenantReceiptLinks = [
    ...new Map(
      [...linksByReceipt, ...linksByTagihan].map((link) => [link.id, link] as const)
    ).values(),
  ];

  const counts: TenantBackupCounts = {
    users: tenantUsers.length,
    routers: tenantRouters.length,
    paketInternet: tenantPaket.length,
    odp: tenantOdp.length,
    pelanggan: tenantPelanggan.length,
    invoices: tenantInvoices.length,
    tagihan: tenantTagihan.length,
    receiptTagihanLinks: tenantReceiptLinks.length,
    tickets: tenantTickets.length,
    ticketAssignments: tenantAssignments.length,
    kategoriPengeluaran: tenantKategori.length,
    pengeluaran: tenantPengeluaran.length,
  };

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tenantId: tenant.id,
    tenantDomain: tenant.domain,
    appVersion: appVersion(),
    counts,
    data: {
      tenant: serializeRow(tenant as unknown as Record<string, unknown>),
      users: tenantUsers.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      routers: tenantRouters.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      paketInternet: tenantPaket.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      odp: tenantOdp.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      pelanggan: tenantPelanggan.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      invoices: tenantInvoices.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      tagihan: tenantTagihan.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      receiptTagihanLinks: tenantReceiptLinks.map((r) =>
        serializeRow(r as unknown as Record<string, unknown>)
      ),
      tickets: tenantTickets.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      ticketAssignments: tenantAssignments.map((r) =>
        serializeRow(r as unknown as Record<string, unknown>)
      ),
      kategoriPengeluaran: tenantKategori.map((r) =>
        serializeRow(r as unknown as Record<string, unknown>)
      ),
      pengeluaran: tenantPengeluaran.map((r) => serializeRow(r as unknown as Record<string, unknown>)),
      tenantDuitkuConfig: duitkuConfig
        ? serializeRow(duitkuConfig as unknown as Record<string, unknown>)
        : null,
      tenantWhatsAppConfig: waConfig
        ? serializeRow(waConfig as unknown as Record<string, unknown>)
        : null,
    },
  };
}

/** Hapus data operasional tenant (pertahankan baris tenant & langganan SaaS). */
export async function clearTenantOperationalData(client: typeof db, tenantId: string) {
  const sqlite = requireSqlite();
  sqlite.pragma("foreign_keys = OFF");
  try {
    await deleteTenantRelatedData(client, tenantId, { keepSubscriptions: true });
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}
