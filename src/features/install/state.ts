import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDatabaseDriver } from "@/lib/db/driver";

export const INSTALL_DIR = path.join(process.cwd(), "data", "install");
export const LOCK_FILE = path.join(INSTALL_DIR, "install.lock.json");
export const SQLITE_UPLOAD = path.join(INSTALL_DIR, "upload.sqlite.db");

export type InstallLock = {
  installedAt: string;
  version: string;
  superadminEmail: string;
};

export async function readInstallLock(): Promise<InstallLock | null> {
  try {
    const raw = await readFile(LOCK_FILE, "utf8");
    return JSON.parse(raw) as InstallLock;
  } catch {
    return null;
  }
}

export async function writeInstallLock(lock: InstallLock) {
  await mkdir(INSTALL_DIR, { recursive: true });
  await writeFile(LOCK_FILE, JSON.stringify(lock, null, 2), "utf8");
}

export async function isInstallLockPresent(): Promise<boolean> {
  try {
    await access(LOCK_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function countSuperadmins(databaseUrl: string): Promise<number> {
  const postgres = (await import("postgres")).default;
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    const rows = await client`SELECT id FROM "user" WHERE role = 'superadmin' LIMIT 1`;
    return rows.length;
  } finally {
    await client.end({ timeout: 5 });
  }
}

export async function getSuperadminEmails(databaseUrl: string): Promise<string[]> {
  const postgres = (await import("postgres")).default;
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    const rows = await client<{ email: string }[]>`
      SELECT email FROM "user" WHERE role = 'superadmin' ORDER BY email
    `;
    return rows.map((r) => r.email);
  } finally {
    await client.end({ timeout: 5 });
  }
}

/** Terpasang jika lock file ada, superadmin PG ada, atau DB SQLite legacy ada. */
export async function isAppInstalled(databaseUrl?: string): Promise<boolean> {
  if (await isInstallLockPresent()) return true;

  const driver = getDatabaseDriver();
  const url = databaseUrl?.trim() || process.env.DATABASE_URL?.trim();

  if (driver === "postgres" || url?.startsWith("postgres")) {
    if (!url) return false;
    try {
      return (await countSuperadmins(url)) > 0;
    } catch {
      return false;
    }
  }

  // Server SQLite lama — jangan paksa installer jika file DB sudah ada
  const sqlitePath = url?.endsWith(".db") ? path.resolve(url) : path.join(process.cwd(), "netmanage.db");
  try {
    await access(sqlitePath);
    return true;
  } catch {
    return false;
  }
}

export async function assertInstallerOpen(databaseUrl?: string) {
  if (await isAppInstalled(databaseUrl)) {
    throw new Error("Aplikasi sudah terpasang. Installer tidak tersedia.");
  }
}

export async function ensureInstallDir() {
  await mkdir(INSTALL_DIR, { recursive: true });
}
