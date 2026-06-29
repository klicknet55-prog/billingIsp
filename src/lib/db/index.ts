import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { createRequire } from "node:module";
import postgres from "postgres";
import { applyAppSchemaMigrations } from "./runtime-schema";
import * as sqliteSchema from "./schema.sqlite";
import { pgSchema } from "./schema.pg";
import { getDatabaseDriver, isPostgresDriver } from "./driver";

const require = createRequire(import.meta.url);

const DB_PATH = process.env.DATABASE_URL ?? "./netmanage.db";

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  pgClient?: ReturnType<typeof postgres>;
};

/** Tipe DB aplikasi — mengacu skema SQLite; API query Drizzle kompatibel dengan Postgres. */
export type AppDb = BetterSQLite3Database<typeof sqliteSchema>;

function loadBetterSqlite3(): typeof Database {
  return require("better-sqlite3") as typeof Database;
}

function createSqliteDb() {
  const BetterSqlite = loadBetterSqlite3();
  const sqlite =
    globalForDb.sqlite ??
    (() => {
      const conn = new BetterSqlite(DB_PATH);
      conn.pragma("journal_mode = WAL");
      conn.pragma("foreign_keys = ON");
      applyAppSchemaMigrations(conn);
      return conn;
    })();

  if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

  return {
    db: drizzleSqlite(sqlite, { schema: sqliteSchema }) as AppDb,
    sqlite,
  };
}

function createPostgresDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL wajib untuk DATABASE_DRIVER=postgres");
  }

  const client =
    globalForDb.pgClient ??
    postgres(url, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 20,
      connect_timeout: 10,
    });

  if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

  return {
    db: drizzlePg(client, { schema: pgSchema }) as unknown as AppDb,
    pgClient: client,
  };
}

const active = isPostgresDriver() ? createPostgresDb() : createSqliteDb();

export const db: AppDb = active.db;
export const schema = isPostgresDriver() ? pgSchema : sqliteSchema;
export const sqlite = "sqlite" in active ? active.sqlite : undefined;
export const pgClient = "pgClient" in active ? active.pgClient : undefined;
export const databaseDriver = getDatabaseDriver();

/** Operasi raw SQLite (backup file, seed) — hanya saat driver sqlite. */
export function requireSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error(
      "Koneksi SQLite tidak tersedia (DATABASE_DRIVER=postgres). Gunakan pg_dump untuk backup Postgres."
    );
  }
  return sqlite;
}
