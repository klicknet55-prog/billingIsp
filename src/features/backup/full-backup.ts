import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { sqlite } from "@/lib/db";

const FULL_BACKUP_DIR = path.join(process.cwd(), "data", "backups", "platform");

export async function exportFullDatabaseBackup(): Promise<{ filePath: string; filename: string }> {
  await mkdir(FULL_BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `netmanage-full-${stamp}.db`;
  const filePath = path.join(FULL_BACKUP_DIR, filename);
  await sqlite.backup(filePath);
  return { filePath, filename };
}

export async function readFullBackupFile(filename: string): Promise<Buffer> {
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Nama file tidak valid.");
  }
  if (!filename.endsWith(".db")) throw new Error("File backup tidak valid.");
  return readFile(path.join(FULL_BACKUP_DIR, filename));
}

export async function cleanupFullBackup(filePath: string) {
  await unlink(filePath).catch(() => {});
}

export function fullBackupDir() {
  return FULL_BACKUP_DIR;
}
