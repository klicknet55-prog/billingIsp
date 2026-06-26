/**
 * Migrasi data SQLite production → PostgreSQL (server baru).
 *
 * Prasyarat:
 *   1. Postgres kosong + npm run db:migrate:pg sudah dijalankan
 *   2. SQLITE_PATH menunjuk ke backup netmanage.db
 *   3. DATABASE_URL menunjuk ke PostgreSQL target
 *
 * Usage:
 *   SQLITE_PATH=./netmanage.db.bak npm run db:migrate-sqlite-to-pg
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { access } from "node:fs/promises";
import path from "node:path";
import {
  invoices,
  kategoriPengeluaran,
  messageBatches,
  messageSendLogs,
  messageTemplates,
  odp,
  otpCodes,
  packageTenants,
  passwordResets,
  paymentAttempts,
  paymentGatewayLogs,
  pelanggan,
  pengeluaran,
  platformSettings,
  platformWhatsAppConfigs,
  receiptTagihanLinks,
  routers,
  sessions,
  subscriptions,
  tagihan,
  tenantDuitkuConfigs,
  tenants,
  tenantWhatsAppConfigs,
  ticketAssignments,
  tickets,
  users,
  paketInternet,
} from "../src/lib/db/schema.pg";

const SQLITE_PATH = process.env.SQLITE_PATH?.trim();
const PG_URL = process.env.DATABASE_URL?.trim();

const TABLE_SPECS: { name: string; table: PgTable }[] = [
  { name: "tenant", table: tenants },
  { name: "package_tenant", table: packageTenants },
  { name: "user", table: users },
  { name: "subscription", table: subscriptions },
  { name: "router", table: routers },
  { name: "paket_internet", table: paketInternet },
  { name: "odp", table: odp },
  { name: "pelanggan", table: pelanggan },
  { name: "invoice", table: invoices },
  { name: "tagihan", table: tagihan },
  { name: "receipt_tagihan_link", table: receiptTagihanLinks },
  { name: "payment_attempt", table: paymentAttempts },
  { name: "ticket", table: tickets },
  { name: "ticket_assignment", table: ticketAssignments },
  { name: "kategori_pengeluaran", table: kategoriPengeluaran },
  { name: "pengeluaran", table: pengeluaran },
  { name: "payment_gateway_log", table: paymentGatewayLogs },
  { name: "tenant_duitku_config", table: tenantDuitkuConfigs },
  { name: "tenant_whatsapp_config", table: tenantWhatsAppConfigs },
  { name: "platform_whatsapp_config", table: platformWhatsAppConfigs },
  { name: "session", table: sessions },
  { name: "otp_code", table: otpCodes },
  { name: "password_reset", table: passwordResets },
  { name: "platform_settings", table: platformSettings },
  { name: "message_template", table: messageTemplates },
  { name: "message_send_log", table: messageSendLogs },
  { name: "message_batch", table: messageBatches },
];

const BOOLEAN_KEYS = new Set(["is_active", "is_online", "is_isolated", "is_enabled"]);
const JSON_KEYS = new Set(["limitasi", "line_items", "payload"]);

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function isTimestampKey(key: string): boolean {
  if (key.endsWith("_at")) return true;
  if (key.startsWith("tgl_")) return true;
  return key === "mulai" || key === "akhir" || key === "tanggal" || key === "due_date";
}

function transformRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    let v = val;
    if (val == null) {
      out[snakeToCamel(key)] = null;
      continue;
    }
    if (BOOLEAN_KEYS.has(key)) {
      v = val === 1 || val === true;
    } else if (JSON_KEYS.has(key)) {
      v = typeof val === "string" ? JSON.parse(val) : val;
    } else if (isTimestampKey(key)) {
      const n = Number(val);
      v = Number.isFinite(n) ? new Date(n * 1000) : val;
    }
    out[snakeToCamel(key)] = v;
  }
  return out;
}

async function main() {
  if (!SQLITE_PATH?.endsWith(".db")) {
    console.error("Set SQLITE_PATH ke file backup SQLite (mis. ./netmanage.db.bak).");
    process.exit(1);
  }
  if (!PG_URL?.startsWith("postgresql://") && !PG_URL?.startsWith("postgres://")) {
    console.error("Set DATABASE_URL ke connection string PostgreSQL target.");
    process.exit(1);
  }

  try {
    await access(SQLITE_PATH);
  } catch {
    console.error(`File SQLite tidak ditemukan: ${SQLITE_PATH}`);
    process.exit(1);
  }

  const pgSchemaPath = path.join(process.cwd(), "src/lib/db/schema.pg.ts");
  try {
    await access(pgSchemaPath);
  } catch {
    console.error("schema.pg.ts tidak ditemukan.");
    process.exit(1);
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const client = postgres(PG_URL, { max: 1 });
  const db = drizzle(client);

  console.log(`SQLite: ${SQLITE_PATH}`);
  console.log(`Postgres: ${PG_URL.replace(/:[^:@/]+@/, ":****@")}`);
  console.log("");

  let totalRows = 0;

  for (const { name, table } of TABLE_SPECS) {
    const exists = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(name);
    if (!exists) {
      console.log(`[skip] ${name} — tidak ada di SQLite`);
      continue;
    }

    const rawRows = sqlite.prepare(`SELECT * FROM ${name}`).all() as Record<string, unknown>[];
    if (rawRows.length === 0) {
      console.log(`[ok]   ${name}: 0 baris`);
      continue;
    }

    const rows = rawRows.map(transformRow);
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      await db.insert(table).values(chunk as never[]);
    }

    totalRows += rows.length;
    console.log(`[ok]   ${name}: ${rows.length} baris`);
  }

  sqlite.close();
  await client.end();

  console.log(`\nSelesai — ${totalRows} baris dimigrasi ke PostgreSQL.`);
  console.log("Verifikasi: login superadmin, owner tenant, dan hitung baris di PG.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
