import type { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { createRequire } from "node:module";
import postgres from "postgres";
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
  pelangganImportBatches,
  pengeluaran,
  platformSettings,
  platformWhatsAppConfigs,
  portalAccessCodes,
  receiptTagihanLinks,
  routers,
  sessions,
  subscriptions,
  tagihan,
  tenantApiKeys,
  tenantDuitkuConfigs,
  tenants,
  tenantWebhooks,
  tenantWhatsAppConfigs,
  ticketAssignments,
  tickets,
  users,
  webhookDeliveryLogs,
  paketInternet,
} from "@/lib/db/schema.pg";
import { DEFAULT_PLATFORM_SETTINGS } from "@/features/platform-settings/defaults";
import type { SqliteMigrationSummary } from "./types";

const require = createRequire(import.meta.url);

export const SQLITE_TABLE_SPECS: { name: string; table: PgTable }[] = [
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
  { name: "portal_access_code", table: portalAccessCodes },
  { name: "ticket", table: tickets },
  { name: "ticket_assignment", table: ticketAssignments },
  { name: "kategori_pengeluaran", table: kategoriPengeluaran },
  { name: "pengeluaran", table: pengeluaran },
  { name: "payment_gateway_log", table: paymentGatewayLogs },
  { name: "tenant_duitku_config", table: tenantDuitkuConfigs },
  { name: "tenant_whatsapp_config", table: tenantWhatsAppConfigs },
  { name: "tenant_api_key", table: tenantApiKeys },
  { name: "tenant_webhook", table: tenantWebhooks },
  { name: "webhook_delivery_log", table: webhookDeliveryLogs },
  { name: "pelanggan_import_batch", table: pelangganImportBatches },
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

function parseSqliteTimestamp(val: unknown): unknown {
  if (val == null) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number" && Number.isFinite(val)) {
    // SQLite unixepoch (detik) atau millis jika sudah > 1e12
    return new Date(val > 1e12 ? val : val * 1000);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) {
      return new Date(asNum > 1e12 ? asNum : asNum * 1000);
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) return new Date(parsed);
  }
  return val;
}

function normalizePlatformSettingsRow(row: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...row,
    id: row.id ?? DEFAULT_PLATFORM_SETTINGS.id,
  };

  const requiredText = [
    "brandName",
    "tentangTitle",
    "tentangContent",
    "kontakTitle",
    "kontakContent",
    "tcTitle",
    "tcContent",
  ] as const;
  for (const key of requiredText) {
    const val = merged[key];
    if (typeof val !== "string" || !val.trim()) {
      merged[key] = DEFAULT_PLATFORM_SETTINGS[key];
    }
  }

  if (merged.mapGeocodingProvider !== "google" && merged.mapGeocodingProvider !== "nominatim") {
    merged.mapGeocodingProvider = "nominatim";
  }
  if (!merged.updatedAt) {
    merged.updatedAt = new Date();
  }

  return merged;
}

export function transformSqliteRow(row: Record<string, unknown>): Record<string, unknown> {
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
      v = parseSqliteTimestamp(val);
    }
    out[snakeToCamel(key)] = v;
  }
  return out;
}

type SqliteDatabase = {
  prepare: (sql: string) => {
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
  };
  close: () => void;
};

export async function migrateSqliteFileToPostgres(
  sqlitePath: string,
  pgUrl: string
): Promise<SqliteMigrationSummary> {
  const Database = require("better-sqlite3") as new (
    path: string,
    opts?: { readonly?: boolean }
  ) => SqliteDatabase;

  const sqlite = new Database(sqlitePath, { readonly: true });
  const client = postgres(pgUrl, { max: 1 });
  const db = drizzle(client);

  const tables: { name: string; rows: number }[] = [];
  let totalRows = 0;

  try {
    for (const { name, table } of SQLITE_TABLE_SPECS) {
      const exists = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(name);
      if (!exists) {
        tables.push({ name, rows: 0 });
        continue;
      }

      const rawRows = sqlite.prepare(`SELECT * FROM ${name}`).all() as Record<string, unknown>[];
      if (rawRows.length === 0) {
        tables.push({ name, rows: 0 });
        continue;
      }

      const rows = rawRows.map(transformSqliteRow);
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        try {
          if (name === "platform_settings") {
            for (const row of chunk) {
              const values = normalizePlatformSettingsRow(row) as typeof platformSettings.$inferInsert;
              const { id, ...patch } = values;
              await db
                .insert(platformSettings)
                .values(values)
                .onConflictDoUpdate({
                  target: platformSettings.id,
                  set: patch,
                });
            }
          } else {
            await db.insert(table).values(chunk as never[]);
          }
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          throw new Error(`Migrasi gagal pada tabel "${name}": ${detail}`);
        }
      }

      totalRows += rows.length;
      tables.push({ name, rows: rows.length });
    }
  } finally {
    sqlite.close();
    await client.end({ timeout: 10 });
  }

  return { totalRows, tables };
}

export async function inspectSqliteFile(sqlitePath: string): Promise<{
  tables: { name: string; rows: number }[];
  totalRows: number;
}> {
  const Database = require("better-sqlite3") as new (
    path: string,
    opts?: { readonly?: boolean }
  ) => SqliteDatabase;

  const sqlite = new Database(sqlitePath, { readonly: true });
  const tables: { name: string; rows: number }[] = [];
  let totalRows = 0;

  try {
    for (const { name } of SQLITE_TABLE_SPECS) {
      const exists = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(name);
      if (!exists) {
        tables.push({ name, rows: 0 });
        continue;
      }
      const row = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${name}`).get() as { c: number };
      const count = Number(row?.c ?? 0);
      tables.push({ name, rows: count });
      totalRows += count;
    }
  } finally {
    sqlite.close();
  }

  return { tables, totalRows };
}
