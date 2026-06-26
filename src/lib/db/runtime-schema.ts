import type Database from "better-sqlite3";
import { applyColumnPatches, hasDbTable } from "./schema-patches";

type TableInfo = { name: string };

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
  return rows.some((r) => r.name === column);
}

/**
 * Migrasi schema yang wajib jalan saat app startup (dev & production).
 * Idempotent — aman dipanggil berulang.
 */
export function applyAppSchemaMigrations(
  db: Database.Database,
  opts?: { log?: boolean }
): number {
  const log = opts?.log ?? false;
  let applied = applyColumnPatches(db, { log });

  if (!hasDbTable(db, "tagihan")) {
    db.exec(`
      CREATE TABLE tagihan (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        pelanggan_id TEXT NOT NULL REFERENCES pelanggan(id),
        periode TEXT NOT NULL,
        amount INTEGER NOT NULL,
        due_date INTEGER NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        receipt_id TEXT REFERENCES invoice(id),
        pre_due_reminded_at INTEGER,
        paid_at INTEGER,
        metode_bayar TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE UNIQUE INDEX IF NOT EXISTS tagihan_tenant_pelanggan_periode ON tagihan(tenant_id, pelanggan_id, periode);
    `);
    applied++;
    if (log) console.log("[ok]   tabel tagihan dibuat");
  }

  if (!hasDbTable(db, "receipt_tagihan_link")) {
    db.exec(`
      CREATE TABLE receipt_tagihan_link (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL REFERENCES invoice(id),
        tagihan_id TEXT NOT NULL REFERENCES tagihan(id),
        amount INTEGER NOT NULL
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel receipt_tagihan_link dibuat");
  }

  if (!hasDbTable(db, "payment_attempt")) {
    db.exec(`
      CREATE TABLE payment_attempt (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenant(id),
        pelanggan_id TEXT NOT NULL REFERENCES pelanggan(id),
        idempotency_key TEXT NOT NULL,
        selection TEXT NOT NULL,
        status TEXT NOT NULL,
        receipt_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
      CREATE UNIQUE INDEX IF NOT EXISTS payment_attempt_idempotency ON payment_attempt(tenant_id, idempotency_key);
    `);
    applied++;
    if (log) console.log("[ok]   tabel payment_attempt dibuat");
  }

  if (!hasDbTable(db, "platform_whatsapp_config")) {
    db.exec(`
      CREATE TABLE platform_whatsapp_config (
        id TEXT PRIMARY KEY,
        api_url TEXT NOT NULL,
        api_token_encrypted TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'waba',
        phone_number_id TEXT,
        device_id TEXT,
        basic_auth_user TEXT,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    applied++;
    if (log) console.log("[ok]   tabel platform_whatsapp_config dibuat");
  }

  if (hasDbTable(db, "pelanggan") && hasColumn(db, "pelanggan", "tgl_daftar")) {
    const backfill = db
      .prepare("UPDATE pelanggan SET tgl_daftar = created_at WHERE tgl_daftar IS NULL")
      .run();
    if (backfill.changes > 0 && log) {
      console.log(`[ok]   pelanggan.tgl_daftar backfill (${backfill.changes} baris)`);
    }
  }

  return applied;
}
