#!/usr/bin/env tsx
/**
 * Snapshot database penuh — SQLite (.backup) atau PostgreSQL (pg_dump).
 * Usage: npm run backup:full [-- --out=./netmanage-full.db]
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { exportFullDatabaseBackup } from "../src/features/backup/full-backup";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const outArg = arg("out");
const { filePath, filename } = await exportFullDatabaseBackup();
const buf = await readFile(filePath);
const outPath = outArg ? path.resolve(outArg) : path.join(process.cwd(), "data", "backups", "platform", filename);

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, buf);
await unlink(filePath).catch(() => {});
console.log(`Full database backup → ${outPath}`);
