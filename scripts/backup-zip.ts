#!/usr/bin/env tsx
/**
 * Backup lengkap aplikasi ke satu file ZIP:
 * - Database (SQLite .backup atau PostgreSQL pg_dump)
 * - Folder data/ (kecuali data/backups agar tidak rekursif)
 * - Folder public/uploads/
 *
 * Usage:
 *   npm run backup:zip
 *   npm run backup:zip -- --out=./my-backup.zip
 */
import { execSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { exportFullDatabaseBackup } from "../src/features/backup/full-backup";
import { isPostgresDeployEnv } from "@/lib/db/pg-backup";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Salin folder rekursif; skip subfolder backups. */
async function copyDataTree(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === "backups") continue;
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      await copyDataTree(from, to);
    } else if (ent.isFile()) {
      await cp(from, to);
    }
  }
}

function createZipArchive(sourceDir: string, zipPath: string) {
  const absSource = path.resolve(sourceDir);
  const absZip = path.resolve(zipPath);

  if (process.platform === "win32") {
    const psSource = absSource.replace(/'/g, "''");
    const psZip = absZip.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -LiteralPath '${psSource}' -DestinationPath '${psZip}' -Force"`,
      { stdio: "inherit" }
    );
    return;
  }

  const parent = path.dirname(absSource);
  const base = path.basename(absSource);
  execSync(`cd "${parent}" && zip -r "${absZip}" "${base}"`, { stdio: "inherit" });
}

async function main() {
  const root = process.cwd();
  const ts = stamp();
  const bundleName = `netmanage-backup-${ts}`;
  const stagingRoot = path.join(root, "data", "backups", "_staging", bundleName);
  const defaultZip = path.join(root, "data", "backups", `${bundleName}.zip`);
  const outZip = arg("out") ? path.resolve(arg("out")!) : defaultZip;

  await rm(stagingRoot, { recursive: true, force: true });
  await mkdir(stagingRoot, { recursive: true });

  console.log("Export database...");
  const { filePath: dbPath, filename: dbFilename } = await exportFullDatabaseBackup();
  const dbDest = path.join(stagingRoot, "database", dbFilename);
  await mkdir(path.dirname(dbDest), { recursive: true });
  await cp(dbPath, dbDest);
  await rm(dbPath, { force: true }).catch(() => {});

  const dataSrc = path.join(root, "data");
  if (await pathExists(dataSrc)) {
    console.log("Salin data/...");
    await copyDataTree(dataSrc, path.join(stagingRoot, "data"));
  }

  const uploadsSrc = path.join(root, "public", "uploads");
  if (await pathExists(uploadsSrc)) {
    console.log("Salin public/uploads/...");
    await cp(uploadsSrc, path.join(stagingRoot, "uploads"), { recursive: true });
  }

  let appVersion = "0.1.0";
  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as { version?: string };
    appVersion = pkg.version ?? appVersion;
  } catch {
    /* ignore */
  }

  const manifest = {
    format: "netmanage-zip-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    appVersion,
    databaseDriver: isPostgresDeployEnv() ? "postgres" : "sqlite",
    databaseFile: `database/${dbFilename}`,
    contents: ["database/", "data/", "uploads/"],
  };
  await writeFile(path.join(stagingRoot, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Buat ZIP → ${outZip}`);
  await mkdir(path.dirname(outZip), { recursive: true });
  createZipArchive(stagingRoot, outZip);

  await rm(path.join(root, "data", "backups", "_staging"), { recursive: true, force: true });

  const zipStat = await stat(outZip);
  const mb = (zipStat.size / (1024 * 1024)).toFixed(2);
  console.log(`Selesai: ${outZip} (${mb} MB)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
