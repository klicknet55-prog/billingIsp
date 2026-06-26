import type Database from "better-sqlite3";

type TableInfo = { name: string };

export const COLUMN_PATCHES: { table: string; column: string; sql: string }[] = [
  {
    table: "subscription",
    column: "billing_period",
    sql: "ALTER TABLE subscription ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'monthly'",
  },
  {
    table: "subscription",
    column: "remind_7d_at",
    sql: "ALTER TABLE subscription ADD COLUMN remind_7d_at INTEGER",
  },
  {
    table: "subscription",
    column: "remind_1d_at",
    sql: "ALTER TABLE subscription ADD COLUMN remind_1d_at INTEGER",
  },
  {
    table: "package_tenant",
    column: "diskon_tahunan_persen",
    sql: "ALTER TABLE package_tenant ADD COLUMN diskon_tahunan_persen INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "invoice",
    column: "pre_due_reminded_at",
    sql: "ALTER TABLE invoice ADD COLUMN pre_due_reminded_at INTEGER",
  },
  {
    table: "paket_internet",
    column: "tipe",
    sql: "ALTER TABLE paket_internet ADD COLUMN tipe TEXT NOT NULL DEFAULT 'pppoe'",
  },
  {
    table: "pelanggan",
    column: "kolektor_id",
    sql: "ALTER TABLE pelanggan ADD COLUMN kolektor_id TEXT REFERENCES user(id)",
  },
  {
    table: "pelanggan",
    column: "odp_id",
    sql: "ALTER TABLE pelanggan ADD COLUMN odp_id TEXT REFERENCES odp(id)",
  },
  {
    table: "pelanggan",
    column: "odp_port",
    sql: "ALTER TABLE pelanggan ADD COLUMN odp_port TEXT",
  },
  {
    table: "router",
    column: "latitude",
    sql: "ALTER TABLE router ADD COLUMN latitude REAL",
  },
  {
    table: "router",
    column: "longitude",
    sql: "ALTER TABLE router ADD COLUMN longitude REAL",
  },
  {
    table: "odp",
    column: "input_router_id",
    sql: "ALTER TABLE odp ADD COLUMN input_router_id TEXT REFERENCES router(id)",
  },
  {
    table: "odp",
    column: "input_odp_id",
    sql: "ALTER TABLE odp ADD COLUMN input_odp_id TEXT REFERENCES odp(id)",
  },
  {
    table: "user",
    column: "latitude",
    sql: "ALTER TABLE user ADD COLUMN latitude REAL",
  },
  {
    table: "user",
    column: "longitude",
    sql: "ALTER TABLE user ADD COLUMN longitude REAL",
  },
  {
    table: "platform_settings",
    column: "cron_last_run_at",
    sql: "ALTER TABLE platform_settings ADD COLUMN cron_last_run_at INTEGER",
  },
  {
    table: "platform_settings",
    column: "cron_last_result",
    sql: "ALTER TABLE platform_settings ADD COLUMN cron_last_result TEXT",
  },
  {
    table: "pelanggan",
    column: "tgl_daftar",
    sql: "ALTER TABLE pelanggan ADD COLUMN tgl_daftar INTEGER",
  },
  {
    table: "invoice",
    column: "line_items",
    sql: "ALTER TABLE invoice ADD COLUMN line_items TEXT",
  },
  {
    table: "tenant_whatsapp_config",
    column: "device_id",
    sql: "ALTER TABLE tenant_whatsapp_config ADD COLUMN device_id TEXT",
  },
  {
    table: "tenant_whatsapp_config",
    column: "basic_auth_user",
    sql: "ALTER TABLE tenant_whatsapp_config ADD COLUMN basic_auth_user TEXT",
  },
];

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
  return rows.some((r) => r.name === column);
}

export function hasDbTable(db: Database.Database, table: string) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(table) as { name: string } | undefined;
  return !!row;
}

function isDuplicateColumnError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "SQLITE_ERROR" &&
    "message" in err &&
    String((err as { message?: string }).message).includes("duplicate column name")
  );
}

/** Tambah kolom yang hilang (idempotent). Dipanggil saat startup app dan CLI ensure-schema. */
export function applyColumnPatches(
  db: Database.Database,
  opts?: { log?: boolean }
): number {
  const log = opts?.log ?? false;
  let applied = 0;

  for (const patch of COLUMN_PATCHES) {
    if (!hasDbTable(db, patch.table)) {
      if (log) console.log(`[skip] ${patch.table} belum ada — lewati ${patch.column}`);
      continue;
    }
    if (hasColumn(db, patch.table, patch.column)) {
      if (log) console.log(`[skip] ${patch.table}.${patch.column} sudah ada`);
      continue;
    }
    try {
      db.exec(patch.sql);
      applied++;
      if (log) console.log(`[ok]   ${patch.table}.${patch.column} ditambahkan`);
    } catch (err) {
      if (isDuplicateColumnError(err)) {
        if (log) console.log(`[skip] ${patch.table}.${patch.column} sudah ada (race)`);
        continue;
      }
      throw err;
    }
  }

  return applied;
}
