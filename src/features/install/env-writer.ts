import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { InstallEnvInput } from "./types";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env");
const EXAMPLE_PATH = path.join(ROOT, ".env.example");

function parseEnv(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function serializeEnv(map: Map<string, string>, template: string): string {
  const lines = template.split("\n");
  const written = new Set<string>();
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (map.has(key)) {
      out.push(`${key}=${map.get(key)!}`);
      written.add(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, val] of map) {
    if (!written.has(key)) out.push(`${key}=${val}`);
  }

  return out.join("\n").replace(/\n?$/, "\n");
}

export function generateAuthSecret(): string {
  return randomBytes(32).toString("hex");
}

export async function readEnvFile(): Promise<Map<string, string>> {
  try {
    return parseEnv(await readFile(ENV_PATH, "utf8"));
  } catch {
    try {
      return parseEnv(await readFile(EXAMPLE_PATH, "utf8"));
    } catch {
      return new Map();
    }
  }
}

export async function writeInstallEnv(input: InstallEnvInput): Promise<void> {
  const template = await readFile(EXAMPLE_PATH, "utf8").catch(() => "");
  const current = await readEnvFile();

  current.set("DATABASE_DRIVER", "postgres");
  current.set("DATABASE_URL", input.databaseUrl);
  current.set("AUTH_SECRET", input.authSecret);
  current.set("NEXT_PUBLIC_APP_URL", input.appUrl);
  current.set("APP_TIMEZONE", input.appTimezone);
  current.set("NEXT_PUBLIC_APP_TIMEZONE", input.appTimezone);

  if (input.cronSecret?.trim()) {
    current.set("CRON_SECRET", input.cronSecret.trim());
  }

  // Hilangkan default SQLite agar tidak bentrok dengan Postgres
  if (current.get("DATABASE_URL")?.startsWith("postgres")) {
    current.delete("SQLITE_PATH");
  }

  const body = serializeEnv(current, template || "DATABASE_DRIVER=postgres\nDATABASE_URL=\nAUTH_SECRET=\n");
  await writeFile(ENV_PATH, body, "utf8");
}

export function getDatabaseUrlFromEnv(map: Map<string, string>): string | null {
  const url = map.get("DATABASE_URL")?.trim();
  return url && url.startsWith("postgres") ? url : null;
}
