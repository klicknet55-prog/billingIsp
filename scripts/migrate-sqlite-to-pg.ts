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
import { access } from "node:fs/promises";
import { migrateSqliteFileToPostgres } from "../src/features/install/sqlite-to-pg";

const SQLITE_PATH = process.env.SQLITE_PATH?.trim();
const PG_URL = process.env.DATABASE_URL?.trim();

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

  console.log(`SQLite: ${SQLITE_PATH}`);
  console.log(`Postgres: ${PG_URL.replace(/:[^:@/]+@/, ":****@")}`);
  console.log("");

  const summary = await migrateSqliteFileToPostgres(SQLITE_PATH, PG_URL);

  for (const t of summary.tables) {
    if (t.rows === 0) console.log(`[ok]   ${t.name}: 0 baris`);
    else console.log(`[ok]   ${t.name}: ${t.rows} baris`);
  }

  console.log(`\nSelesai — ${summary.totalRows} baris dimigrasi ke PostgreSQL.`);
  console.log("Verifikasi: login superadmin, owner tenant, dan hitung baris di PG.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
