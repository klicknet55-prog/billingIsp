import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { normalizePhone } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import {
  invoices,
  kategoriPengeluaran,
  odp,
  packageTenants,
  pelanggan,
  pengeluaran,
  paketInternet,
  paymentGatewayLogs,
  routers,
  ticketAssignments,
  tickets,
  subscriptions,
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  tenants,
  users,
  sessions,
  type PackageTenant,
  type Tenant,
  type User,
} from "@/lib/db/schema";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { createLogger } from "@/lib/logger";
import { notifyNewTenantWelcome } from "./welcome";
import { newId } from "@/lib/utils";

const log = createLogger("tenants");
export type BillingPeriod = "monthly" | "yearly";

const SUBSCRIPTION_DURATION_DAYS: Record<BillingPeriod, number> = {
  monthly: 30,
  yearly: 365,
};

export function calculateSaasPackageAmount(
  pkg: Pick<PackageTenant, "hargaBulanan" | "diskonTahunanPersen">,
  billingPeriod: BillingPeriod
) {
  const effectivePeriod = normalizeSaasBillingPeriod(pkg, billingPeriod);
  if (effectivePeriod === "monthly") return pkg.hargaBulanan;
  const annualBase = pkg.hargaBulanan * 12;
  const discount = Math.min(Math.max(pkg.diskonTahunanPersen ?? 0, 0), 100);
  return Math.round(annualBase * (100 - discount) / 100);
}

export function normalizeSaasBillingPeriod(
  pkg: Pick<PackageTenant, "hargaBulanan">,
  billingPeriod: BillingPeriod
): BillingPeriod {
  return pkg.hargaBulanan <= 0 ? "monthly" : billingPeriod;
}

function getSubscriptionEndDate(billingPeriod: BillingPeriod) {
  const day = 24 * 60 * 60 * 1000;
  return new Date(Date.now() + SUBSCRIPTION_DURATION_DAYS[billingPeriod] * day);
}

export async function listTenants(): Promise<Tenant[]> {
  return db.query.tenants.findMany({ orderBy: [desc(tenants.createdAt)] });
}

export async function listTenantsWithSubscription() {
  const rows = await listTenants();
  return Promise.all(
    rows.map(async (tenant) => ({
      tenant,
      subscription: await getTenantSubscriptionStatus(tenant.id),
    }))
  );
}

export async function getTenantById(id: string) {
  return db.query.tenants.findFirst({ where: eq(tenants.id, id) });
}

export async function setTenantStatus(id: string, status: "active" | "suspended") {
  await db.update(tenants).set({ status }).where(eq(tenants.id, id));
  log.info(`Tenant ${id} -> ${status}`);
}

/**
 * Hapus tenant secara permanen hanya jika status nonaktif.
 * Dipakai oleh superadmin untuk membersihkan akun yang tidak aktif.
 */
export async function deleteTenantIfInactive(id: string) {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, id) });
  if (!tenant) throw new Error("Tenant tidak ditemukan.");
  if (tenant.status === "active") {
    throw new Error("Tenant aktif tidak bisa dihapus. Nonaktifkan dulu.");
  }

  await db.transaction(async (tx) => {
    const tenantUsers = await tx.query.users.findMany({
      where: eq(users.tenantId, id),
      columns: { id: true },
    });
    const userIds = tenantUsers.map((u) => u.id);

    const tenantTickets = await tx.query.tickets.findMany({
      where: eq(tickets.tenantId, id),
      columns: { id: true },
    });
    const ticketIds = tenantTickets.map((t) => t.id);

    if (ticketIds.length > 0) {
      await tx.delete(ticketAssignments).where(inArray(ticketAssignments.ticketId, ticketIds));
    }
    if (userIds.length > 0) {
      await tx.delete(ticketAssignments).where(inArray(ticketAssignments.userId, userIds));
    }

    await tx.delete(tickets).where(eq(tickets.tenantId, id));
    await tx.delete(invoices).where(eq(invoices.tenantId, id));
    await tx.delete(pelanggan).where(eq(pelanggan.tenantId, id));
    await tx.delete(odp).where(eq(odp.tenantId, id));
    await tx.delete(pengeluaran).where(eq(pengeluaran.tenantId, id));
    await tx.delete(kategoriPengeluaran).where(eq(kategoriPengeluaran.tenantId, id));
    await tx.delete(routers).where(eq(routers.tenantId, id));
    await tx.delete(paketInternet).where(eq(paketInternet.tenantId, id));
    await tx.delete(subscriptions).where(eq(subscriptions.tenantId, id));
    await tx.delete(paymentGatewayLogs).where(eq(paymentGatewayLogs.tenantId, id));
    await tx.delete(tenantDuitkuConfigs).where(eq(tenantDuitkuConfigs.tenantId, id));
    await tx.delete(tenantWhatsAppConfigs).where(eq(tenantWhatsAppConfigs.tenantId, id));
    await tx.delete(sessions).where(eq(sessions.tenantId, id));
    await tx.delete(users).where(eq(users.tenantId, id));
    await tx.delete(tenants).where(eq(tenants.id, id));
  });

  log.info(`Tenant ${id} dihapus permanen`);
}

export async function listPackages(): Promise<PackageTenant[]> {
  return db.query.packageTenants.findMany();
}

export async function getPackage(id: string) {
  return db.query.packageTenants.findFirst({ where: eq(packageTenants.id, id) });
}

export interface SaasPackageInput {
  nama: string;
  hargaBulanan: number;
  diskonTahunanPersen: number;
  maxPelanggan: number;
  maxRouter: number;
  fitur: string[];
  isActive: boolean;
}

export async function createSaasPackage(input: SaasPackageInput) {
  await db.insert(packageTenants).values({
    id: newId("pkg"),
    nama: input.nama,
    hargaBulanan: input.hargaBulanan,
    diskonTahunanPersen: input.diskonTahunanPersen,
    limitasi: {
      maxPelanggan: input.maxPelanggan,
      maxRouter: input.maxRouter,
      fitur: input.fitur,
    },
    isActive: input.isActive,
  });
  log.info(`Paket SaaS dibuat: ${input.nama}`);
}

export async function updateSaasPackage(id: string, input: SaasPackageInput) {
  await db
    .update(packageTenants)
    .set({
      nama: input.nama,
      hargaBulanan: input.hargaBulanan,
      diskonTahunanPersen: input.diskonTahunanPersen,
      limitasi: {
        maxPelanggan: input.maxPelanggan,
        maxRouter: input.maxRouter,
        fitur: input.fitur,
      },
      isActive: input.isActive,
    })
    .where(eq(packageTenants.id, id));
}

export async function deleteSaasPackage(id: string) {
  await db.delete(packageTenants).where(eq(packageTenants.id, id));
}

export async function listSaasTransactions() {
  return db.query.paymentGatewayLogs.findMany({
    where: eq(paymentGatewayLogs.referenceType, "subscription"),
    orderBy: [desc(paymentGatewayLogs.createdAt)],
  });
}

export async function logSaasTransaction(input: {
  tenantId: string;
  referenceId: string;
  orderId: string;
  status: "pending" | "success" | "failed";
  amount: number;
  paymentMethod?: string | null;
}) {
  await db.insert(paymentGatewayLogs).values({
    id: newId("pgl"),
    tenantId: input.tenantId,
    referenceType: "subscription",
    referenceId: input.referenceId,
    duitkuOrderId: input.orderId,
    status: input.status,
    amount: input.amount,
    paymentMethod: input.paymentMethod ?? null,
  });
}

export interface TenantQuotaSnapshot {
  paketNama: string;
  totalPelanggan: number;
  totalRouter: number;
  maxPelanggan: number | null;
  maxRouter: number | null;
}

/** Kuota tenant berdasarkan subscription aktif + pemakaian saat ini. */
export async function getTenantQuotaSnapshot(
  tenantId: string
): Promise<TenantQuotaSnapshot | null> {
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.status, "active")),
    orderBy: [desc(subscriptions.mulai)],
  });
  if (!sub) return null;
  const pkg = await db.query.packageTenants.findFirst({
    where: eq(packageTenants.id, sub.packageTenantId),
  });
  if (!pkg) return null;

  const [totalPelanggan, totalRouter] = await Promise.all([
    db.$count(pelanggan, eq(pelanggan.tenantId, tenantId)),
    db.$count(routers, eq(routers.tenantId, tenantId)),
  ]);

  return {
    paketNama: pkg.nama,
    totalPelanggan,
    totalRouter,
    maxPelanggan:
      typeof pkg.limitasi?.maxPelanggan === "number" ? pkg.limitasi.maxPelanggan : null,
    maxRouter: typeof pkg.limitasi?.maxRouter === "number" ? pkg.limitasi.maxRouter : null,
  };
}

export interface TenantSubscriptionStatus {
  packageId: string;
  packageName: string;
  packagePrice: number;
  billingPeriod: BillingPeriod;
  status: "active" | "expired";
  mulai: Date;
  akhir: Date;
}

export async function getTenantSubscriptionStatus(
  tenantId: string
): Promise<TenantSubscriptionStatus | null> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tenantId, tenantId),
    orderBy: [desc(subscriptions.mulai)],
  });
  if (!sub) return null;
  const pkg = await db.query.packageTenants.findFirst({
    where: eq(packageTenants.id, sub.packageTenantId),
  });
  if (!pkg) return null;

  const now = new Date();
  const expired = sub.status === "expired" || sub.akhir < now;

  return {
    packageId: pkg.id,
    packageName: pkg.nama,
    packagePrice: pkg.hargaBulanan,
    billingPeriod: sub.billingPeriod,
    status: expired ? "expired" : "active",
    mulai: sub.mulai,
    akhir: sub.akhir,
  };
}

/** Perpanjang langganan tenant (superadmin). */
export async function extendTenantSubscription(
  tenantId: string,
  input: { days?: number; akhir?: Date }
) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tenantId, tenantId),
    orderBy: [desc(subscriptions.mulai)],
  });
  if (!sub) throw new Error("Langganan tenant tidak ditemukan.");

  const now = new Date();
  const days = input.days ?? 30;
  let newEnd: Date;
  if (input.akhir) {
    newEnd = input.akhir;
  } else {
    const base = sub.akhir > now ? sub.akhir : now;
    newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  }

  await db
    .update(subscriptions)
    .set({
      status: "active",
      akhir: newEnd,
      remind7dAt: null,
      remind1dAt: null,
    })
    .where(eq(subscriptions.id, sub.id));
  await db.update(tenants).set({ status: "active" }).where(eq(tenants.id, tenantId));
  log.info(`Tenant ${tenantId} langganan diperpanjang hingga ${newEnd.toISOString()}`);
}

export async function listActiveSaasPackages() {
  return db.query.packageTenants.findMany({
    where: eq(packageTenants.isActive, true),
    orderBy: [asc(packageTenants.hargaBulanan), asc(packageTenants.nama)],
  });
}

/**
 * Upgrade/downgrade paket langganan tenant.
 * Untuk mode mock perpindahan paket dilakukan langsung saat disubmit.
 */
export async function changeTenantSubscriptionPackage(
  tenantId: string,
  packageId: string,
  billingPeriod: BillingPeriod
) {
  const pkg = await db.query.packageTenants.findFirst({
    where: and(eq(packageTenants.id, packageId), eq(packageTenants.isActive, true)),
  });
  if (!pkg) throw new Error("Paket tujuan tidak ditemukan atau tidak aktif.");
  const effectivePeriod = normalizeSaasBillingPeriod(pkg, billingPeriod);

  const activeSub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.status, "active")),
    orderBy: [desc(subscriptions.mulai)],
  });

  if (activeSub) {
    await db
      .update(subscriptions)
      .set({
        packageTenantId: pkg.id,
        billingPeriod: effectivePeriod,
        mulai: new Date(),
        akhir: getSubscriptionEndDate(effectivePeriod),
        status: "active",
        remind7dAt: null,
        remind1dAt: null,
      })
      .where(eq(subscriptions.id, activeSub.id));
  } else {
    await db.insert(subscriptions).values({
      id: newId("sub"),
      tenantId,
      packageTenantId: pkg.id,
      billingPeriod: effectivePeriod,
      mulai: new Date(),
      akhir: getSubscriptionEndDate(effectivePeriod),
      status: "active",
    });
  }

  await db.update(tenants).set({ status: "active" }).where(eq(tenants.id, tenantId));
  log.info(`Tenant ${tenantId} pindah paket -> ${pkg.nama} (${effectivePeriod})`);
}

export interface RegisterTenantInput {
  namaUsaha: string;
  domain: string;
  adminNama: string;
  adminPhone: string;
  email: string;
  password: string;
  packageId: string;
  billingPeriod: BillingPeriod;
}

type RegisterTenantResult =
  | { tenant: Tenant; owner: User }
  | { checkoutUrl: string }
  | { error: string };

/**
 * Pendaftaran tenant self-service. Pada mode mock, pembayaran langsung
 * dianggap sukses sehingga tenant & akun owner langsung aktif.
 */
export async function registerTenant(
  input: RegisterTenantInput
): Promise<RegisterTenantResult> {
  const domain = input.domain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
  if (!domain) return { error: "Domain tidak valid." };

  const existsDomain = await db.query.tenants.findFirst({
    where: eq(tenants.domain, domain),
  });
  if (existsDomain) return { error: "Domain sudah dipakai." };

  const email = input.email.toLowerCase().trim();
  const existsEmail = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existsEmail) return { error: "Email sudah terdaftar." };

  const adminPhone = normalizePhone(input.adminPhone.trim());
  if (adminPhone.length < 10) return { error: "No. WhatsApp admin wajib diisi (min. 10 digit)." };

  const pkg = await db.query.packageTenants.findFirst({
    where: and(eq(packageTenants.id, input.packageId), eq(packageTenants.isActive, true)),
  });
  if (!pkg) return { error: "Paket tidak ditemukan atau tidak aktif." };

  const tenantId = newId("tnt");
  const ownerId = newId("usr");
  const orderId = `SUB-${tenantId}`;
  const billingPeriod = normalizeSaasBillingPeriod(pkg, input.billingPeriod);
  const amount = calculateSaasPackageAmount(pkg, billingPeriod);
  const tenant: Tenant = {
    id: tenantId,
    namaUsaha: input.namaUsaha.trim(),
    logoUrl: null,
    domain,
    status: process.env.DUITKU_DRIVER === "real" ? "suspended" : "active",
    themePreset: "default",
    themeMode: "light",
    createdAt: new Date(),
  };
  await db.insert(tenants).values(tenant);
  await db.insert(subscriptions).values({
    id: newId("sub"),
    tenantId,
    packageTenantId: pkg.id,
    billingPeriod,
    mulai: new Date(),
    akhir: getSubscriptionEndDate(billingPeriod),
    status: process.env.DUITKU_DRIVER === "real" ? "expired" : "active",
  });

  const owner: User = {
    id: ownerId,
    tenantId,
    nama: input.adminNama.trim(),
    email,
    passwordHash: hashPassword(input.password),
    role: "owner",
    phone: adminPhone,
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: new Date(),
  };
  await db.insert(users).values(owner);

  // Paket gratis tidak perlu lewat payment gateway.
  if (amount <= 0) {
    await db.update(tenants).set({ status: "active" }).where(eq(tenants.id, tenantId));
    await db
      .update(subscriptions)
      .set({ status: "active" })
      .where(eq(subscriptions.tenantId, tenantId));
    await db.insert(paymentGatewayLogs).values({
      id: newId("pgl"),
      tenantId,
      referenceType: "subscription",
      referenceId: tenantId,
      duitkuOrderId: orderId,
      status: "success",
      amount: 0,
      paymentMethod: "FREE",
    });
    await notifyNewTenantWelcome({ ...tenant, status: "active" }, owner);
    return { tenant: { ...tenant, status: "active" }, owner };
  }

  const duitku = getDuitkuClient();
  let trx: Awaited<ReturnType<typeof duitku.createTransaction>>;
  try {
    trx = await duitku.createTransaction({
      orderId,
      amount,
      productName: `Langganan ${pkg.nama} ${billingPeriod === "yearly" ? "Tahunan" : "Bulanan"}`,
      customerName: input.adminNama,
      tenantId,
    });
  } catch (err) {
    // Rollback provisioning jika gagal membuat transaksi pertama.
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Gagal membuat transaksi Duitku. ${msg}` };
  }

  if (process.env.DUITKU_DRIVER === "real") {
    await db.insert(paymentGatewayLogs).values({
      id: newId("pgl"),
      tenantId,
      referenceType: "subscription",
      referenceId: tenantId,
      duitkuOrderId: orderId,
      status: "pending",
      amount,
      paymentMethod: process.env.DUITKU_PAYMENT_METHOD ?? null,
    });
    log.info(`Tenant pending payment: ${domain}`);
    return { checkoutUrl: trx.paymentUrl };
  }

  // Mode mock: dianggap sukses instan.
  const paid = duitku.simulatePaid(orderId, amount);
  await db.insert(paymentGatewayLogs).values({
    id: newId("pgl"),
    tenantId,
    referenceType: "subscription",
    referenceId: tenantId,
    duitkuOrderId: orderId,
    status: paid.status,
    amount: paid.amount,
    paymentMethod: paid.paymentMethod,
  });

  log.info(`Tenant baru terdaftar: ${domain}`);
  await notifyNewTenantWelcome(tenant, owner);
  return { tenant, owner };
}
