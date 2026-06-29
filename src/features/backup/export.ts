import { eq, inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db, requireSqlite } from "@/lib/db";
import {
  invoices,
  kategoriPengeluaran,
  messageBatches,
  messageSendLogs,
  odp,
  paketInternet,
  paymentAttempts,
  paymentGatewayLogs,
  pelanggan,
  pelangganImportBatches,
  pengeluaran,
  portalAccessCodes,
  receiptTagihanLinks,
  routers,
  sessions,
  tagihan,
  tenantApiKeys,
  tenantDuitkuConfigs,
  tenantWebhooks,
  tenantWhatsAppConfigs,
  tenants,
  ticketAssignments,
  tickets,
  users,
  webhookDeliveryLogs,
} from "@/lib/db/schema";
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
    const tenantUsers = await client.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      columns: { id: true },
    });
    const userIds = tenantUsers.map((u) => u.id);

    const tenantTicketRows = await client.query.tickets.findMany({
      where: eq(tickets.tenantId, tenantId),
      columns: { id: true },
    });
    const ticketIds = tenantTicketRows.map((t) => t.id);

    const tenantInvoices = await client.query.invoices.findMany({
      where: eq(invoices.tenantId, tenantId),
      columns: { id: true },
    });
    const invoiceIds = tenantInvoices.map((i) => i.id);

    const tenantTagihan = await client.query.tagihan.findMany({
      where: eq(tagihan.tenantId, tenantId),
      columns: { id: true },
    });
    const tagihanIds = tenantTagihan.map((t) => t.id);

    if (tagihanIds.length > 0) {
      await client
        .delete(receiptTagihanLinks)
        .where(inArray(receiptTagihanLinks.tagihanId, tagihanIds));
    }
    if (invoiceIds.length > 0) {
      await client
        .delete(receiptTagihanLinks)
        .where(inArray(receiptTagihanLinks.receiptId, invoiceIds));
    }

    await client.delete(webhookDeliveryLogs).where(eq(webhookDeliveryLogs.tenantId, tenantId));
    await client.delete(tenantWebhooks).where(eq(tenantWebhooks.tenantId, tenantId));
    await client.delete(tenantApiKeys).where(eq(tenantApiKeys.tenantId, tenantId));
    await client.delete(pelangganImportBatches).where(eq(pelangganImportBatches.tenantId, tenantId));
    await client.delete(paymentAttempts).where(eq(paymentAttempts.tenantId, tenantId));
    await client.delete(messageSendLogs).where(eq(messageSendLogs.tenantId, tenantId));
    await client.delete(messageBatches).where(eq(messageBatches.tenantId, tenantId));
    await client.delete(portalAccessCodes).where(eq(portalAccessCodes.tenantId, tenantId));

    if (ticketIds.length > 0) {
      await client.delete(ticketAssignments).where(inArray(ticketAssignments.ticketId, ticketIds));
    }
    if (userIds.length > 0) {
      await client.delete(ticketAssignments).where(inArray(ticketAssignments.userId, userIds));
    }

    await client.delete(tickets).where(eq(tickets.tenantId, tenantId));
    await client.delete(tagihan).where(eq(tagihan.tenantId, tenantId));
    await client.delete(invoices).where(eq(invoices.tenantId, tenantId));
    await client.delete(pelanggan).where(eq(pelanggan.tenantId, tenantId));
    await client.delete(odp).where(eq(odp.tenantId, tenantId));
    await client.delete(pengeluaran).where(eq(pengeluaran.tenantId, tenantId));
    await client.delete(kategoriPengeluaran).where(eq(kategoriPengeluaran.tenantId, tenantId));
    await client.delete(paketInternet).where(eq(paketInternet.tenantId, tenantId));
    await client.delete(routers).where(eq(routers.tenantId, tenantId));
    await client.delete(paymentGatewayLogs).where(eq(paymentGatewayLogs.tenantId, tenantId));
    await client.delete(tenantDuitkuConfigs).where(eq(tenantDuitkuConfigs.tenantId, tenantId));
    await client.delete(tenantWhatsAppConfigs).where(eq(tenantWhatsAppConfigs.tenantId, tenantId));
    await client.delete(sessions).where(eq(sessions.tenantId, tenantId));
    await client.delete(users).where(eq(users.tenantId, tenantId));
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}
