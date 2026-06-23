import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { exportTenantBackup } from "./export";
import type { TenantBackupPayload } from "./types";

export function tenantBackupDir(tenantId: string) {
  return path.join(process.cwd(), "data", "backups", "tenant", tenantId);
}

export async function saveTenantSnapshot(
  tenantId: string,
  reason: "pre-restore"
): Promise<string> {
  const payload = await exportTenantBackup(tenantId);
  const dir = tenantBackupDir(tenantId);
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${reason}-${stamp}.netmanage.json`;
  const filePath = path.join(dir, filename);
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return filePath;
}

export async function listTenantSnapshots(tenantId: string): Promise<
  { filename: string; mtime: Date; size: number }[]
> {
  const dir = tenantBackupDir(tenantId);
  try {
    const files = await readdir(dir);
    const items = await Promise.all(
      files
        .filter((f) => f.endsWith(".netmanage.json"))
        .map(async (filename) => {
          const filePath = path.join(dir, filename);
          const s = await stat(filePath);
          return { filename, mtime: s.mtime, size: s.size };
        })
    );
    return items.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } catch {
    return [];
  }
}

export function parseBackupBuffer(buffer: Buffer, isGzip: boolean): TenantBackupPayload {
  const raw = isGzip ? gunzipSync(buffer) : buffer;
  const text = raw.toString("utf8");
  if (text.length > 50 * 1024 * 1024) {
    throw new Error("File backup terlalu besar (maks. 50 MB).");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File backup bukan JSON valid.");
  }
  return parsed as TenantBackupPayload;
}

export function backupToDownloadBytes(payload: TenantBackupPayload, gzip: boolean): Buffer {
  const json = JSON.stringify(payload);
  return gzip ? gzipSync(Buffer.from(json, "utf8")) : Buffer.from(json, "utf8");
}

export async function readSnapshotFile(
  tenantId: string,
  filename: string
): Promise<TenantBackupPayload> {
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Nama file tidak valid.");
  }
  const filePath = path.join(tenantBackupDir(tenantId), filename);
  const buf = await readFile(filePath);
  return parseBackupBuffer(buf, false);
}
