#!/usr/bin/env tsx
/**
 * Export backup JSON untuk satu tenant.
 * Usage: npm run backup:tenant -- --tenant-id=ten_xxx [--out=./backup.json] [--gzip]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { exportTenantBackup } from "../src/features/backup/export";
import { backupToDownloadBytes } from "../src/features/backup/snapshot";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const tenantId = arg("tenant-id");
if (!tenantId) {
  console.error("Usage: npm run backup:tenant -- --tenant-id=ten_xxx [--out=path] [--gzip]");
  process.exit(1);
}

const gzip = process.argv.includes("--gzip");
const outArg = arg("out");

const payload = await exportTenantBackup(tenantId);
const bytes = backupToDownloadBytes(payload, gzip);
const stamp = new Date().toISOString().slice(0, 10);
const defaultName = `backup-${payload.tenantDomain}-${stamp}.netmanage.json${gzip ? ".gz" : ""}`;
const outPath = outArg
  ? path.resolve(outArg)
  : path.join(process.cwd(), "data", "backups", "tenant", tenantId, defaultName);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, bytes);
console.log(`Backup tenant ${payload.tenantDomain} → ${outPath}`);
console.log(JSON.stringify(payload.counts, null, 2));
