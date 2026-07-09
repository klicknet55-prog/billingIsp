import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const DRIZZLE_BIN = path.join(ROOT, "node_modules", "drizzle-kit", "bin.cjs");
const DRIZZLE_CONFIG = "drizzle.config.postgres.ts";

function migrationEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_DRIVER: "postgres",
    DATABASE_URL: databaseUrl,
  };
}

function formatExecError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as { message?: string; stdout?: string | Buffer; stderr?: string | Buffer };
  const stdout = e.stdout?.toString().trim() ?? "";
  const stderr = e.stderr?.toString().trim() ?? "";
  const detail = [stdout, stderr].filter(Boolean).join("\n");
  if (detail) return detail.slice(0, 2000);
  return e.message ?? "Migrasi gagal";
}

/** Jalankan drizzle-kit migrate langsung via Node (tanpa npm — andal di bawah PM2). */
export function runPostgresMigrations(databaseUrl: string): void {
  try {
    execFileSync(process.execPath, [DRIZZLE_BIN, "migrate", `--config=${DRIZZLE_CONFIG}`], {
      cwd: ROOT,
      stdio: "pipe",
      encoding: "utf8",
      env: migrationEnv(databaseUrl),
    });
  } catch (err) {
    throw new Error(formatExecError(err));
  }
}

export async function postgresSchemaEmpty(databaseUrl: string): Promise<boolean> {
  const postgres = (await import("postgres")).default;
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    const rows = await client<{ c: string }[]>`
      SELECT COUNT(*)::text AS c FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    return Number(rows[0]?.c ?? 0) === 0;
  } finally {
    await client.end({ timeout: 5 });
  }
}

export async function postgresHasMigrations(databaseUrl: string): Promise<boolean> {
  const postgres = (await import("postgres")).default;
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    const rows = await client`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user'
      LIMIT 1
    `;
    return rows.length > 0;
  } finally {
    await client.end({ timeout: 5 });
  }
}

export function migrationLogPath(): string {
  return path.join(ROOT, "drizzle", "pg");
}
