import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  packageTenants,
  paketInternet,
  pelanggan,
  routers,
  subscriptions,
  tenants,
  users,
} from "@/lib/db/schema";
import { portalPayLink } from "@/features/jobs/billing";
import { formatBillingPeriod, formatDate, formatRupiah } from "@/lib/utils";
import { getTenantSubscriptionStatus } from "@/features/tenants/service";

export type PelangganContextVars = Record<string, string>;

export async function buildPelangganContext(
  tenantId: string,
  pelangganId: string,
  invoiceId?: string | null
): Promise<PelangganContextVars> {
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)),
  });
  if (!cust) throw new Error("Pelanggan tidak ditemukan.");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  const paket = cust.paketInternetId
    ? await db.query.paketInternet.findFirst({ where: eq(paketInternet.id, cust.paketInternetId) })
    : null;
  const router = cust.routerId
    ? await db.query.routers.findFirst({ where: eq(routers.id, cust.routerId) })
    : null;

  let inv = invoiceId
    ? await db.query.invoices.findFirst({
        where: and(eq(invoices.tenantId, tenantId), eq(invoices.id, invoiceId)),
      })
    : null;

  if (!inv) {
    const rows = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.pelangganId, pelangganId),
          eq(invoices.status, "unpaid")
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    inv = rows[0] ?? null;
  }

  const dueDate = inv?.tglJatuhTempo ?? cust.tglJatuhTempo ?? new Date();

  return {
    nama_pelanggan: cust.nama,
    no_wa: cust.noWa,
    alamat: cust.alamat ?? "",
    tagihan: formatBillingPeriod(dueDate),
    no_invoice: inv?.noInvoice ?? "-",
    jumlah_tagihan: inv ? formatRupiah(inv.totalTagihan) : "-",
    jatuh_tempo: formatDate(dueDate),
    link_bayar: portalPayLink(tenantId, pelangganId),
    nama_usaha: tenant?.namaUsaha ?? "",
    paket: paket?.nama ?? "",
    router: router?.nama ?? "",
  };
}

export async function buildTenantOwnerContext(tenantId: string): Promise<Record<string, string>> {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw new Error("Tenant tidak ditemukan.");

  const owner = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "owner"), eq(users.isActive, true)),
  });

  const subStatus = await getTenantSubscriptionStatus(tenantId);
  const pkg = subStatus?.packageId
    ? await db.query.packageTenants.findFirst({
        where: eq(packageTenants.id, subStatus.packageId),
      })
    : null;

  const now = new Date();
  const akhir = subStatus?.akhir ?? now;
  const DAY = 24 * 60 * 60 * 1000;
  const sisaHari = Math.max(
    0,
    Math.round((akhir.getTime() - now.getTime()) / DAY)
  );

  return {
    nama_usaha: tenant.namaUsaha,
    nama_owner: owner?.nama ?? "",
    domain: tenant.domain,
    paket_saas: pkg?.nama ?? "",
    langganan_akhir: formatDate(akhir),
    sisa_hari: String(sisaHari),
  };
}

export async function buildInvoiceCronContext(
  tenantId: string,
  pelangganId: string,
  invoice: { noInvoice: string; totalTagihan: number; tglJatuhTempo: Date | null }
): Promise<PelangganContextVars> {
  const base = await buildPelangganContext(tenantId, pelangganId);
  const dueDate = invoice.tglJatuhTempo ?? new Date();
  return {
    ...base,
    no_invoice: invoice.noInvoice,
    jumlah_tagihan: formatRupiah(invoice.totalTagihan),
    jatuh_tempo: formatDate(dueDate),
    tagihan: formatBillingPeriod(dueDate),
    link_bayar: portalPayLink(tenantId, pelangganId),
  };
}
