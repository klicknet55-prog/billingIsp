import { execSync } from "node:child_process";
import { isPostgresDriver } from "./driver";

export function isPostgresDatabaseUrl(url?: string | null): boolean {
  const u = (url ?? process.env.DATABASE_URL ?? "").trim();
  return u.startsWith("postgresql://") || u.startsWith("postgres://");
}

/** Sumber tunggal: DATABASE_DRIVER=postgres (bukan hanya bentuk DATABASE_URL). */
export function isPostgresDeployEnv(): boolean {
  return isPostgresDriver();
}

/**
 * Dump PostgreSQL ke file SQL plain text.
 * Membutuhkan `pg_dump` terpasang di PATH server (Linux production).
 */
export function runPgDump(outputPath: string): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !isPostgresDatabaseUrl(url)) {
    throw new Error("DATABASE_URL PostgreSQL wajib untuk pg_dump.");
  }

  const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";
  const escapedPath = outputPath.replace(/"/g, '\\"');
  const escapedUrl = url.replace(/"/g, '\\"');

  execSync(`pg_dump "${escapedUrl}" --no-owner --no-acl -F p -f "${escapedPath}"`, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    shell,
  });
}
