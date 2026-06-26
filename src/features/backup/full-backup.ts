import { mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { isPostgresDeployEnv, runPgDump } from "@/lib/db/pg-backup";
import { requireSqlite } from "@/lib/db";

const FULL_BACKUP_DIR = path.join(process.cwd(), "data", "backups", "platform");

export async function exportFullDatabaseBackup(): Promise<{ filePath: string; filename: string }> {
  await mkdir(FULL_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (isPostgresDeployEnv()) {
    const filename = `netmanage-full-${stamp}.sql`;
    const filePath = path.join(FULL_BACKUP_DIR, filename);
    runPgDump(filePath);
    return { filePath, filename };
  }

  const filename = `netmanage-full-${stamp}.db`;
  const filePath = path.join(FULL_BACKUP_DIR, filename);
  await requireSqlite().backup(filePath);
  return { filePath, filename };
}

export async function readFullBackupFile(filename: string): Promise<Buffer> {
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Nama file tidak valid.");
  }
  if (!filename.endsWith(".db") && !filename.endsWith(".sql")) {
    throw new Error("File backup tidak valid.");
  }
  return readFile(path.join(FULL_BACKUP_DIR, filename));
}

export async function cleanupFullBackup(filePath: string) {
  await unlink(filePath).catch(() => {});
}

export function fullBackupDir() {
  return FULL_BACKUP_DIR;
}

export function fullBackupMimeType(filename: string): string {
  if (filename.endsWith(".sql")) return "application/sql";
  return "application/octet-stream";
}
