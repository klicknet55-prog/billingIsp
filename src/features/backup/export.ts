import { and, eq, inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/lib/db";
import {
  invoices,
  kategoriPengeluaran,
  odp,
  paketInternet,
  paymentGatewayLogs,
  pelanggan,
  pengeluaran,
  routers,
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  tenants,
  ticketAssignments,
  tickets,
  users,
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
    db.query.tickets.findMany({ where: eq(tickets.tenantId, tenantId) }),
    db.query.kategoriPengeluaran.findMany({ where: eq(kategoriPengeluaran.tenantId, tenantId) }),
    db.query.pengeluaran.findMany({ where: eq(pengeluaran.tenantId, tenantId) }),
    db.query.tenantDuitkuConfigs.findFirst({ where: eq(tenantDuitkuConfigs.tenantId, tenantId) }),
    db.query.tenantWhatsAppConfigs.findFirst({ where: eq(tenantWhatsAppConfigs.tenantId, tenantId) }),
  ]);

  const ticketIds = tenantTickets.map((t) => t.id);
  const tenantAssignments =
    ticketIds.length > 0
      ? await db.query.ticketAssignments.findMany({
          where: inArray(ticketAssignments.ticketId, ticketIds),
        })
      : [];

  const counts: TenantBackupCounts = {
    users: tenantUsers.length,
    routers: tenantRouters.length,
    paketInternet: tenantPaket.length,
    odp: tenantOdp.length,
    pelanggan: tenantPelanggan.length,
    invoices: tenantInvoices.length,
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
export async function clearTenantOperationalData(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string
) {
  const tenantUsers = await tx.query.users.findMany({
    where: eq(users.tenantId, tenantId),
    columns: { id: true },
  });
  const userIds = tenantUsers.map((u) => u.id);

  const tenantTicketRows = await tx.query.tickets.findMany({
    where: eq(tickets.tenantId, tenantId),
    columns: { id: true },
  });
  const ticketIds = tenantTicketRows.map((t) => t.id);

  if (ticketIds.length > 0) {
    await tx.delete(ticketAssignments).where(inArray(ticketAssignments.ticketId, ticketIds));
  }
  if (userIds.length > 0) {
    await tx.delete(ticketAssignments).where(inArray(ticketAssignments.userId, userIds));
  }

  await tx.delete(tickets).where(eq(tickets.tenantId, tenantId));
  await tx.delete(invoices).where(eq(invoices.tenantId, tenantId));
  await tx.delete(pelanggan).where(eq(pelanggan.tenantId, tenantId));
  await tx.delete(odp).where(eq(odp.tenantId, tenantId));
  await tx.delete(pengeluaran).where(eq(pengeluaran.tenantId, tenantId));
  await tx.delete(kategoriPengeluaran).where(eq(kategoriPengeluaran.tenantId, tenantId));
  await tx.delete(paketInternet).where(eq(paketInternet.tenantId, tenantId));
  await tx.delete(routers).where(eq(routers.tenantId, tenantId));
  await tx
    .delete(paymentGatewayLogs)
    .where(
      and(eq(paymentGatewayLogs.tenantId, tenantId), eq(paymentGatewayLogs.referenceType, "invoice"))
    );
  await tx.delete(tenantDuitkuConfigs).where(eq(tenantDuitkuConfigs.tenantId, tenantId));
  await tx.delete(tenantWhatsAppConfigs).where(eq(tenantWhatsAppConfigs.tenantId, tenantId));
  await tx.delete(users).where(eq(users.tenantId, tenantId));
}
