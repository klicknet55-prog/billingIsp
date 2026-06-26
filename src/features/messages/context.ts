import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  packageTenants,
  paketInternet,
  pelanggan,
  routers,
  tagihan,
  tenants,
  users,
} from "@/lib/db/schema";
import { getTagihanSummary } from "@/features/billing/tagihan-service";
import { portalPayLink } from "@/features/jobs/billing";
import { formatBillingPeriod, formatDate, formatRupiah } from "@/lib/utils";
import { getTenantSubscriptionStatus } from "@/features/tenants/service";

export type PelangganContextVars = Record<string, string>;

/** YYYY-MM → contoh: Juni 2026 */
export function formatTagihanPeriode(periode: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periode);
  if (!match) return periode;
  return formatBillingPeriod(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}

/** Ringkasan tunggakan untuk placeholder [[tunggakan]]. */
export function formatTunggakanLabel(
  rows: { periode: string; amount: number }[]
): string {
  if (rows.length === 0) return "-";
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const periods = rows
    .slice()
    .sort((a, b) => a.periode.localeCompare(b.periode))
    .map((r) => formatTagihanPeriode(r.periode));
  if (periods.length === 1) {
    return `${formatRupiah(total)} (${periods[0]})`;
  }
  return `${formatRupiah(total)} (${periods.join(", ")})`;
}

export async function buildPelangganContext(
  tenantId: string,
  pelangganId: string,
  tagihanId?: string | null
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

  const summary = await getTagihanSummary(tenantId, pelangganId);

  let focus = tagihanId
    ? await db.query.tagihan.findFirst({
        where: and(
          eq(tagihan.tenantId, tenantId),
          eq(tagihan.pelangganId, pelangganId),
          eq(tagihan.id, tagihanId)
        ),
      })
    : null;

  if (!focus) {
    focus = summary.bulanIni ?? summary.tunggakan[0] ?? null;
  }

  const dueDate = focus?.dueDate ?? cust.tglJatuhTempo ?? new Date();

  return {
    nama_pelanggan: cust.nama,
    no_wa: cust.noWa,
    alamat: cust.alamat ?? "",
    tagihan: focus ? formatTagihanPeriode(focus.periode) : "-",
    no_invoice: focus?.periode ?? "-",
    jumlah_tagihan: focus ? formatRupiah(focus.amount) : "-",
    tunggakan: formatTunggakanLabel(summary.tunggakan),
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

/** Konteks cron reminder/isolasi — overlay tagihan spesifik di atas ringkasan pelanggan. */
export async function buildTagihanCronContext(
  tenantId: string,
  pelangganId: string,
  row: { periode: string; amount: number; dueDate: Date }
): Promise<PelangganContextVars> {
  const base = await buildPelangganContext(tenantId, pelangganId);
  return {
    ...base,
    tagihan: formatTagihanPeriode(row.periode),
    no_invoice: row.periode,
    jumlah_tagihan: formatRupiah(row.amount),
    jatuh_tempo: formatDate(row.dueDate),
  };
}

/** @deprecated Gunakan buildTagihanCronContext */
export async function buildInvoiceCronContext(
  tenantId: string,
  pelangganId: string,
  invoice: { noInvoice: string; totalTagihan: number; tglJatuhTempo: Date | null }
): Promise<PelangganContextVars> {
  return buildTagihanCronContext(tenantId, pelangganId, {
    periode: invoice.noInvoice,
    amount: invoice.totalTagihan,
    dueDate: invoice.tglJatuhTempo ?? new Date(),
  });
}
