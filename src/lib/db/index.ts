import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { applyColumnPatches } from "./schema-patches";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_URL ?? "./netmanage.db";

// Singleton agar tidak membuat banyak koneksi saat hot-reload (dev).
const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
};

const sqlite =
  globalForDb.sqlite ??
  (() => {
    const conn = new Database(DB_PATH);
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    applyColumnPatches(conn);
    return conn;
  })();

if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema, sqlite };
