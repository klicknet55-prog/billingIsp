import { access, constants } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import type { RequirementCheck } from "./types";

const MIN_NODE_MAJOR = 20;

function nodeVersionCheck(): RequirementCheck {
  const ver = process.version;
  const major = Number.parseInt(ver.slice(1).split(".")[0] ?? "0", 10);
  if (major >= MIN_NODE_MAJOR) {
    return { id: "node", label: "Node.js", status: "ok", detail: ver };
  }
  return {
    id: "node",
    label: "Node.js",
    status: "fail",
    detail: `${ver} — minimal v${MIN_NODE_MAJOR}.x`,
  };
}

async function writablePath(label: string, id: string, target: string): Promise<RequirementCheck> {
  try {
    await access(path.dirname(target), constants.W_OK);
    return { id, label, status: "ok", detail: target };
  } catch {
    return { id, label, status: "fail", detail: `Tidak bisa menulis: ${target}` };
  }
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore", shell: "/bin/bash" });
    return true;
  } catch {
    try {
      execSync(`where ${cmd}`, { stdio: "ignore", shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash" });
      return true;
    } catch {
      return false;
    }
  }
}

export async function testPostgresConnection(databaseUrl: string): Promise<RequirementCheck> {
  if (!databaseUrl.startsWith("postgres")) {
    return {
      id: "pg_connect",
      label: "Koneksi PostgreSQL",
      status: "fail",
      detail: "DATABASE_URL harus postgresql://...",
    };
  }
  try {
    const postgres = (await import("postgres")).default;
    const client = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
    const [row] = await client<{ version: string }[]>`SELECT version() AS version`;
    await client.end({ timeout: 5 });
    const short = row?.version?.split(" ")[0] ?? "PostgreSQL";
    return { id: "pg_connect", label: "Koneksi PostgreSQL", status: "ok", detail: short };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      id: "pg_connect",
      label: "Koneksi PostgreSQL",
      status: "fail",
      detail: msg.slice(0, 200),
    };
  }
}

export async function runRequirementsCheck(databaseUrl?: string): Promise<RequirementCheck[]> {
  const root = process.cwd();
  const checks: RequirementCheck[] = [
    nodeVersionCheck(),
    await writablePath("Folder data/", "data_dir", path.join(root, "data", "install")),
    await writablePath("Folder uploads/", "uploads_dir", path.join(root, "public", "uploads")),
    await writablePath("File .env", "env_file", path.join(root, ".env")),
  ];

  if (commandExists("pg_dump")) {
    checks.push({
      id: "pg_dump",
      label: "pg_dump (backup)",
      status: "ok",
      detail: "Tersedia di PATH",
    });
  } else {
    checks.push({
      id: "pg_dump",
      label: "pg_dump (backup)",
      status: "warn",
      detail: "Tidak ditemukan — backup PG dari dashboard mungkin gagal",
    });
  }

  if (process.env.REDIS_URL?.trim()) {
    checks.push({
      id: "redis",
      label: "Redis (queue)",
      status: "ok",
      detail: process.env.REDIS_URL.replace(/:[^:@/]+@/, ":****@"),
    });
  } else {
    checks.push({
      id: "redis",
      label: "Redis (queue)",
      status: "warn",
      detail: "REDIS_URL kosong — queue inline/fallback",
    });
  }

  if (databaseUrl?.trim()) {
    checks.push(await testPostgresConnection(databaseUrl.trim()));
  }

  return checks;
}

export function requirementsBlocking(checks: RequirementCheck[]): boolean {
  return checks.some((c) => c.status === "fail");
}
