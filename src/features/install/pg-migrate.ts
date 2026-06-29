import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();

export function runPostgresMigrations(databaseUrl: string): void {
  execSync("npm run db:migrate:pg", {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_DRIVER: "postgres",
      DATABASE_URL: databaseUrl,
    },
    shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash",
  });
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
