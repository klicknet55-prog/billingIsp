import "server-only";
import { desc, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import {
  packageTenants,
  paymentGatewayLogs,
  subscriptions,
  tenants,
  users,
  type PackageTenant,
  type Tenant,
  type User,
} from "@/lib/db/schema";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("tenants");

export async function listTenants(): Promise<Tenant[]> {
  return db.query.tenants.findMany({ orderBy: [desc(tenants.createdAt)] });
}

export async function setTenantStatus(id: string, status: "active" | "suspended") {
  await db.update(tenants).set({ status }).where(eq(tenants.id, id));
  log.info(`Tenant ${id} -> ${status}`);
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

export interface RegisterTenantInput {
  namaUsaha: string;
  domain: string;
  adminNama: string;
  email: string;
  password: string;
  packageId: string;
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

  const pkg = await db.query.packageTenants.findFirst({
    where: eq(packageTenants.id, input.packageId),
  });
  if (!pkg) return { error: "Paket tidak ditemukan." };

  const day = 24 * 60 * 60 * 1000;
  const tenantId = newId("tnt");
  const ownerId = newId("usr");
  const orderId = `SUB-${tenantId}`;
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
    mulai: new Date(),
    akhir: new Date(Date.now() + 30 * day),
    status: process.env.DUITKU_DRIVER === "real" ? "expired" : "active",
  });

  const owner: User = {
    id: ownerId,
    tenantId,
    nama: input.adminNama.trim(),
    email,
    passwordHash: hashPassword(input.password),
    role: "owner",
    phone: null,
    isActive: true,
    createdAt: new Date(),
  };
  await db.insert(users).values(owner);

  // Paket gratis tidak perlu lewat payment gateway.
  if (pkg.hargaBulanan <= 0) {
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
    return { tenant: { ...tenant, status: "active" }, owner };
  }

  const duitku = getDuitkuClient();
  let trx: Awaited<ReturnType<typeof duitku.createTransaction>>;
  try {
    trx = await duitku.createTransaction({
      orderId,
      amount: pkg.hargaBulanan,
      productName: `Langganan ${pkg.nama}`,
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
      amount: pkg.hargaBulanan,
      paymentMethod: process.env.DUITKU_PAYMENT_METHOD ?? null,
    });
    log.info(`Tenant pending payment: ${domain}`);
    return { checkoutUrl: trx.paymentUrl };
  }

  // Mode mock: dianggap sukses instan.
  const paid = duitku.simulatePaid(orderId, pkg.hargaBulanan);
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
  return { tenant, owner };
}
