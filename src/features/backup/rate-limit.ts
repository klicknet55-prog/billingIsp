import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_RESTORE_PER_DAY } from "./types";
import { tenantBackupDir } from "./snapshot";

function restoreLogPath(tenantId: string) {
  return path.join(tenantBackupDir(tenantId), ".restore-log.json");
}

export async function assertRestoreRateLimit(tenantId: string) {
  const logPath = restoreLogPath(tenantId);
  await mkdir(tenantBackupDir(tenantId), { recursive: true });
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  let timestamps: number[] = [];
  try {
    const raw = await readFile(logPath, "utf8");
    timestamps = (JSON.parse(raw) as number[]).filter((t) => t > dayAgo);
  } catch {
    timestamps = [];
  }
  if (timestamps.length >= MAX_RESTORE_PER_DAY) {
    throw new Error(
      `Batas restore tercapai (${MAX_RESTORE_PER_DAY}x per 24 jam). Coba lagi besok.`
    );
  }
  timestamps.push(Date.now());
  await writeFile(logPath, JSON.stringify(timestamps), "utf8");
}
