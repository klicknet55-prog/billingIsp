/**
 * Tambah kolom SQLite yang hilang (idempotent). Aman dijalankan berulang.
 * Dipakai saat deploy production jika `db:push` tidak membaca `.env` yang sama dengan app.
 */
import Database from "better-sqlite3";

const DB_PATH = process.env.DATABASE_URL ?? "./netmanage.db";

type TableInfo = { name: string };

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
  return rows.some((r) => r.name === column);
}

const patches: { table: string; column: string; sql: string }[] = [
  {
    table: "subscription",
    column: "billing_period",
    sql: "ALTER TABLE subscription ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'monthly'",
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
];

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

let applied = 0;
for (const patch of patches) {
  if (hasColumn(db, patch.table, patch.column)) {
    console.log(`[skip] ${patch.table}.${patch.column} sudah ada`);
    continue;
  }
  db.exec(patch.sql);
  applied++;
  console.log(`[ok]   ${patch.table}.${patch.column} ditambahkan`);
}

if (hasColumn(db, "paket_internet", "tipe") && hasColumn(db, "router", "tipe")) {
  const result = db
    .prepare(
      `UPDATE paket_internet
       SET tipe = (
         SELECT r.tipe FROM router r WHERE r.id = paket_internet.router_id
       )
       WHERE router_id IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM router r
           WHERE r.id = paket_internet.router_id AND r.tipe IS NOT NULL
         )`
    )
    .run();
  if (result.changes > 0) {
    console.log(`[ok]   paket_internet.tipe di-backfill dari router (${result.changes} baris)`);
  }
}

db.close();
console.log(applied > 0 ? `Selesai — ${applied} kolom baru.` : "Selesai — tidak ada perubahan.");
