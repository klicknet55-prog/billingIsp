/**
 * Uji Fase 3: subscription demo expired → tenant suspend; cron tidak generate invoice.
 *
 * Jalankan: npm run saas-expire:test
 * Hanya siapkan data: npm run db:seed-saas-expire-test
 * Via HTTP (dev server wajib jalan): npm run saas-expire:test:http
 */
import { and, eq, inArray, like, lt } from "drizzle-orm";
import { db } from "./index";
import { invoices, paketInternet, pelanggan, routers, subscriptions, tenants, users } from "./schema";
import { newId } from "../utils";

const DAY = 24 * 60 * 60 * 1000;
const GENERATE_DAYS = Number(process.env.BILLING_GENERATE_DAYS ?? 7);
const DEMO_DOMAIN = "demo";
const CRON_TEST_PREFIX = "[SAAS-EXPIRE-TEST]";
const TEST_PELANGGAN_ID = "pel-saas-expire";

type CronResult = {
  ok: boolean;
  billing: { generated: number };
  saas: { expired: number; suspended: number };
};

type Snapshot = {
  tenantId: string;
  tenantStatus: "active" | "suspended";
  subId: string;
  subStatus: "active" | "expired";
  subAkhir: Date;
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(base: Date, days: number): Date {
  return new Date(startOfDay(base).getTime() + days * DAY);
}

function sameBillingPeriod(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function invoiceGenerateWindowStart(dueDate: Date): Date {
  return new Date(startOfDay(dueDate).getTime() - GENERATE_DAYS * DAY);
}

function shouldGenerateInvoice(now: Date, dueDate: Date): boolean {
  const today = startOfDay(now);
  const due = startOfDay(dueDate);
  return today >= startOfDay(invoiceGenerateWindowStart(due)) && today <= due;
}

function nextDueDateFromDay(dueDay: number, now: Date): Date {
  const today = startOfDay(now);
  let due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  }
  return due;
}

function resolveDueDate(custTglJatuhTempo: Date | null, custCreatedAt: Date, now: Date): Date {
  if (custTglJatuhTempo) {
    const anchor = startOfDay(custTglJatuhTempo);
    if (anchor >= startOfDay(now)) return anchor;
    return nextDueDateFromDay(anchor.getDate(), now);
  }
  return nextDueDateFromDay(custCreatedAt.getDate(), now);
}

async function hasInvoiceForBillingPeriod(
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

/** Mirror /api/cron — SaaS expire dulu, billing generate untuk tenant active saja. */
async function runCronLocal(): Promise<CronResult> {
  const now = new Date();
  let expired = 0;
  let suspended = 0;

  const overdueSubs = await db.query.subscriptions.findMany({
    where: and(eq(subscriptions.status, "active"), lt(subscriptions.akhir, now)),
  });
  for (const sub of overdueSubs) {
    await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(eq(subscriptions.id, sub.id));
    await db.update(tenants).set({ status: "suspended" }).where(eq(tenants.id, sub.tenantId));
    expired++;
    suspended++;
  }

  let generated = 0;
  const activeTenants = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.status, "active"));

  for (const { id: tenantId } of activeTenants) {
    const customers = await db
      .select({
        id: pelanggan.id,
        tglJatuhTempo: pelanggan.tglJatuhTempo,
        createdAt: pelanggan.createdAt,
        paketId: pelanggan.paketInternetId,
        harga: paketInternet.hargaBulanan,
      })
      .from(pelanggan)
      .innerJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
      .where(and(eq(pelanggan.tenantId, tenantId), eq(paketInternet.isActive, true)));

    for (const cust of customers) {
      if (!cust.paketId || cust.harga <= 0) continue;
      const dueDate = resolveDueDate(cust.tglJatuhTempo, cust.createdAt, now);
      if (!shouldGenerateInvoice(now, dueDate)) continue;
      if (await hasInvoiceForBillingPeriod(tenantId, cust.id, dueDate)) continue;

      const count = await db.$count(invoices, eq(invoices.tenantId, tenantId));
      await db.insert(invoices).values({
        id: newId("inv"),
        tenantId,
        pelangganId: cust.id,
        noInvoice: `INV-${String(count + 1).padStart(4, "0")}`,
        totalTagihan: cust.harga,
        status: "unpaid",
        tglJatuhTempo: dueDate,
        createdBy: null,
      });
      generated++;
    }
  }

  return {
    ok: true,
    billing: { generated },
    saas: { expired, suspended },
  };
}

async function findDemoTenant() {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.domain, DEMO_DOMAIN),
  });
  if (!tenant) {
    throw new Error(`Tenant demo (domain "${DEMO_DOMAIN}") tidak ditemukan. Jalankan npm run db:seed.`);
  }
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tenantId, tenant.id),
  });
  if (!sub) {
    throw new Error("Subscription demo tidak ditemukan.");
  }
  return { tenant, sub };
}

async function cleanupTestPelanggan(tenantId: string) {
  const existing = await db.query.pelanggan.findMany({
    where: and(eq(pelanggan.tenantId, tenantId), like(pelanggan.nama, `${CRON_TEST_PREFIX}%`)),
    columns: { id: true },
  });
  const ids = [...new Set([TEST_PELANGGAN_ID, ...existing.map((p) => p.id)])];
  await db.delete(invoices).where(inArray(invoices.pelangganId, ids));
  await db.delete(pelanggan).where(inArray(pelanggan.id, ids));
}

async function seedSaasExpireScenario(): Promise<{ snapshot: Snapshot }> {
  const { tenant, sub } = await findDemoTenant();
  const owner = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenant.id), eq(users.role, "owner")),
  });
  const paket = await db.query.paketInternet.findFirst({
    where: and(eq(paketInternet.tenantId, tenant.id), eq(paketInternet.isActive, true)),
  });
  const router = paket?.routerId
    ? await db.query.routers.findFirst({ where: eq(routers.id, paket.routerId) })
    : await db.query.routers.findFirst({ where: eq(routers.tenantId, tenant.id) });

  if (!paket || !router) {
    throw new Error("Demo tenant belum punya paket/router aktif.");
  }

  const snapshot: Snapshot = {
    tenantId: tenant.id,
    tenantStatus: tenant.status,
    subId: sub.id,
    subStatus: sub.status,
    subAkhir: sub.akhir,
  };

  await cleanupTestPelanggan(tenant.id);

  const now = new Date();
  const dueGenerate = addDays(now, 5);
  const expiredAkhir = addDays(now, -1);

  await db.insert(pelanggan).values({
    id: TEST_PELANGGAN_ID,
    tenantId: tenant.id,
    nama: `${CRON_TEST_PREFIX} Invoice Blocked`,
    noWa: "628999999901",
    connectionType: paket.tipe,
    connectionUsername: "saasexpire01",
    connectionPassword: "testpass",
    alamat: "Alamat uji SaaS expire",
    paketInternetId: paket.id,
    routerId: router.id,
    tglJatuhTempo: dueGenerate,
    isIsolated: false,
    createdBy: owner?.id ?? null,
  });

  await db
    .update(subscriptions)
    .set({
      status: "active",
      akhir: expiredAkhir,
      remind7dAt: null,
      remind1dAt: null,
    })
    .where(eq(subscriptions.id, sub.id));
  await db.update(tenants).set({ status: "active" }).where(eq(tenants.id, tenant.id));

  console.log(`Tenant demo: ${tenant.namaUsaha} (${tenant.id})`);
  console.log(`Subscription akhir (simulasi expired): ${expiredAkhir.toISOString().slice(0, 10)}`);
  console.log(
    `Pelanggan uji: ${TEST_PELANGGAN_ID} — jatuh tempo ${dueGenerate.toISOString().slice(0, 10)} (masuk jendela generate H-${GENERATE_DAYS})`
  );
  console.log("");
  console.log("Ekspektasi setelah cron:");
  console.log("  saas.suspended >= 1, tenant demo → suspended");
  console.log("  subscription demo → expired");
  console.log("  billing.generated = 0 (tenant sudah suspend sebelum generate)");

  return { snapshot };
}

async function restoreSnapshot(snapshot: Snapshot) {
  await db
    .update(subscriptions)
    .set({
      status: snapshot.subStatus,
      akhir: snapshot.subAkhir,
      remind7dAt: null,
      remind1dAt: null,
    })
    .where(eq(subscriptions.id, snapshot.subId));
  await db
    .update(tenants)
    .set({ status: snapshot.tenantStatus })
    .where(eq(tenants.id, snapshot.tenantId));
  await cleanupTestPelanggan(snapshot.tenantId);
}

async function countTenantInvoices(tenantId: string) {
  return db.$count(invoices, eq(invoices.tenantId, tenantId));
}

async function countTestPelangganInvoices() {
  return db.$count(invoices, eq(invoices.pelangganId, TEST_PELANGGAN_ID));
}

async function invokeCronHttp(): Promise<CronResult> {
  const url = process.env.CRON_TEST_URL?.trim() || "http://localhost:3000/api/cron";
  const headers: Record<string, string> = {};
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  console.log(`Memanggil ${url} ...`);
  const res = await fetch(url, { headers });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Cron HTTP gagal ${res.status}: ${body}`);
  }
  return JSON.parse(body) as CronResult;
}

async function runAssertions(
  snapshot: Snapshot,
  cronResult: CronResult,
  invoicesBefore: number,
  testInvoicesBefore: number
) {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, snapshot.tenantId) });
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, snapshot.subId) });
  const invoicesAfter = await countTenantInvoices(snapshot.tenantId);
  const testInvoicesAfter = await countTestPelangganInvoices();

  const checks: { label: string; ok: boolean; detail: string }[] = [
    {
      label: "Tenant demo suspended",
      ok: tenant?.status === "suspended",
      detail: `status=${tenant?.status ?? "?"}`,
    },
    {
      label: "Subscription demo expired",
      ok: sub?.status === "expired",
      detail: `status=${sub?.status ?? "?"}`,
    },
    {
      label: "Cron SaaS suspend ≥ 1",
      ok: cronResult.saas.suspended >= 1,
      detail: `saas.suspended=${cronResult.saas.suspended}`,
    },
    {
      label: "Tidak ada invoice baru (semua pelanggan demo)",
      ok: invoicesAfter === invoicesBefore,
      detail: `${invoicesBefore} → ${invoicesAfter}`,
    },
    {
      label: "Tidak ada invoice untuk pelanggan uji",
      ok: testInvoicesAfter === testInvoicesBefore && testInvoicesAfter === 0,
      detail: `${testInvoicesBefore} → ${testInvoicesAfter}`,
    },
    {
      label: "Billing generated = 0 (tenant suspend)",
      ok: cronResult.billing.generated === 0,
      detail: `billing.generated=${cronResult.billing.generated}`,
    },
  ];

  console.log("");
  console.log("Hasil cron:", JSON.stringify(cronResult, null, 2));
  console.log("");
  console.log("Verifikasi:");
  let passed = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    console.log(`  [${mark}] ${c.label} (${c.detail})`);
    if (c.ok) passed++;
  }

  if (passed !== checks.length) {
    throw new Error(`${checks.length - passed} dari ${checks.length} assertion gagal.`);
  }
  console.log("");
  console.log(`Semua ${checks.length} assertion lulus.`);
}

async function main() {
  const seedOnly = process.argv.includes("--seed-only");
  const useHttp = process.argv.includes("--http");

  const { snapshot } = await seedSaasExpireScenario();
  if (seedOnly) {
    console.log("");
    console.log("Seed selesai. Jalankan: npm run saas-expire:test");
    return;
  }

  const invoicesBefore = await countTenantInvoices(snapshot.tenantId);
  const testInvoicesBefore = await countTestPelangganInvoices();

  try {
    const cronResult = useHttp ? await invokeCronHttp() : await runCronLocal();
    await runAssertions(snapshot, cronResult, invoicesBefore, testInvoicesBefore);
  } finally {
    console.log("");
    console.log("Mengembalikan subscription demo ke kondisi semula...");
    await restoreSnapshot(snapshot);
    console.log("Restore selesai.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
