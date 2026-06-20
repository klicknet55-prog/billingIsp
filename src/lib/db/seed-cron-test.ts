/**
 * Siapkan data uji untuk endpoint /api/cron (generate, reminder H-3, overdue + isolir).
 * Jalankan: npm run cron:test
 * Hanya seed: npm run db:seed-cron-test
 */
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "./index";
import { invoices, paketInternet, pelanggan, routers, tenants, users } from "./schema";
import { newId } from "../utils";

const DAY = 24 * 60 * 60 * 1000;
const CRON_TEST_PREFIX = "[CRON-TEST]";
const CRON_TEST_IDS = ["pel-cron-gen", "pel-cron-remind", "pel-cron-overdue"] as const;

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(base: Date, days: number): Date {
  return new Date(startOfDay(base).getTime() + days * DAY);
}

async function cleanupCronTestData(tenantId: string) {
  const existing = await db.query.pelanggan.findMany({
    where: and(eq(pelanggan.tenantId, tenantId), like(pelanggan.nama, `${CRON_TEST_PREFIX}%`)),
    columns: { id: true },
  });
  const ids = [...new Set([...CRON_TEST_IDS, ...existing.map((p) => p.id)])];
  if (ids.length === 0) return;

  await db.delete(invoices).where(inArray(invoices.pelangganId, ids));
  await db.delete(pelanggan).where(inArray(pelanggan.id, ids));
}

async function seedCronTestData() {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.status, "active"),
  });
  if (!tenant) {
    throw new Error("Tidak ada tenant aktif. Jalankan npm run db:seed terlebih dahulu.");
  }

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
    throw new Error("Tenant aktif belum punya paket/router. Jalankan npm run db:seed atau isi data ISP.");
  }

  await cleanupCronTestData(tenant.id);

  const now = new Date();
  const dueGenerate = addDays(now, 5);
  const dueRemind = addDays(now, 2);
  const dueOverdue = addDays(now, -3);

  const basePelanggan = {
    tenantId: tenant.id,
    connectionType: paket.tipe,
    connectionUsername: "cronuser",
    connectionPassword: "cronpass",
    alamat: "Alamat uji cron",
    paketInternetId: paket.id,
    routerId: router.id,
    isIsolated: false,
    createdBy: owner?.id ?? null,
  };

  await db.insert(pelanggan).values([
    {
      ...basePelanggan,
      id: CRON_TEST_IDS[0],
      nama: `${CRON_TEST_PREFIX} Generate Invoice`,
      noWa: "628999999001",
      tglJatuhTempo: dueGenerate,
    },
    {
      ...basePelanggan,
      id: CRON_TEST_IDS[1],
      nama: `${CRON_TEST_PREFIX} Reminder H-3`,
      noWa: "628999999002",
      tglJatuhTempo: dueRemind,
      connectionUsername: "cronuser2",
    },
    {
      ...basePelanggan,
      id: CRON_TEST_IDS[2],
      nama: `${CRON_TEST_PREFIX} Overdue + Isolir`,
      noWa: "628999999003",
      tglJatuhTempo: dueOverdue,
      connectionUsername: "cronuser3",
    },
  ]);

  await db.insert(invoices).values([
    {
      id: newId("inv"),
      tenantId: tenant.id,
      pelangganId: CRON_TEST_IDS[1],
      noInvoice: "CRON-REMIND-001",
      totalTagihan: paket.hargaBulanan,
      status: "unpaid",
      tglJatuhTempo: dueRemind,
      preDueRemindedAt: null,
      createdBy: owner?.id ?? null,
    },
    {
      id: newId("inv"),
      tenantId: tenant.id,
      pelangganId: CRON_TEST_IDS[2],
      noInvoice: "CRON-OVERDUE-001",
      totalTagihan: paket.hargaBulanan,
      status: "unpaid",
      tglJatuhTempo: dueOverdue,
      preDueRemindedAt: null,
      createdBy: owner?.id ?? null,
    },
  ]);

  console.log(`Tenant: ${tenant.namaUsaha} (${tenant.id})`);
  console.log(`Paket: ${paket.nama} — Rp ${paket.hargaBulanan.toLocaleString("id-ID")}`);
  console.log("");
  console.log("Skenario uji cron:");
  console.log(`  1. Generate invoice  → ${CRON_TEST_IDS[0]} (jatuh tempo ${dueGenerate.toISOString().slice(0, 10)})`);
  console.log(`  2. Reminder H-3        → ${CRON_TEST_IDS[1]} (invoice CRON-REMIND-001, jatuh ${dueRemind.toISOString().slice(0, 10)})`);
  console.log(`  3. Overdue + isolir    → ${CRON_TEST_IDS[2]} (invoice CRON-OVERDUE-001, jatuh ${dueOverdue.toISOString().slice(0, 10)})`);
  console.log("");
  console.log("Ekspektasi setelah cron (WHATSAPP_DRIVER=mock → cek terminal dev server):");
  console.log("  generated: 1, generatedNotified: 1, preDueReminded: 1, overdue: 1, isolated: 1, reminded: 1");
}

async function invokeCron() {
  const url = process.env.CRON_TEST_URL?.trim() || "http://localhost:3000/api/cron";
  const headers: Record<string, string> = {};
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  console.log(`Memanggil ${url} ...`);
  const res = await fetch(url, { headers });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Cron gagal HTTP ${res.status}: ${body}`);
  }
  console.log("Hasil cron:");
  console.log(body);
}

async function main() {
  const seedOnly = process.argv.includes("--seed-only");
  await seedCronTestData();
  if (seedOnly) {
    console.log("");
    console.log("Seed selesai. Jalankan: curl.exe -sS http://localhost:3000/api/cron");
    return;
  }
  await invokeCron();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
