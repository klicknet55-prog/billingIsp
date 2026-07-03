"use server";

import { readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createSuperadminUser, seedFreshPlatformData } from "./bootstrap";
import { generateAuthSecret, readEnvFile, writeInstallEnv } from "./env-writer";
import { postgresHasMigrations, runPostgresMigrations } from "./pg-migrate";
import { requirementsBlocking, runRequirementsCheck } from "./requirements";
import {
  assertInstallerOpen,
  countSuperadmins,
  ensureInstallDir,
  getSuperadminEmails,
  isAppInstalled,
  SQLITE_UPLOAD,
  writeInstallLock,
} from "./state";
import { inspectSqliteFile, migrateSqliteFileToPostgres } from "./sqlite-to-pg";
import type {
  DataSourceMode,
  InstallActionResult,
  InstallEnvInput,
  RequirementCheck,
  SqliteMigrationSummary,
  SuperadminInput,
} from "./types";

function pkgVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function fail(error: string): InstallActionResult<never> {
  return { ok: false, error };
}

export async function checkInstallStatusAction(): Promise<
  InstallActionResult<{ installed: boolean }>
> {
  try {
    const env = await readEnvFile();
    const url = env.get("DATABASE_URL");
    const installed = await isAppInstalled(url);
    return { ok: true, data: { installed } };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export async function checkRequirementsAction(
  databaseUrl?: string
): Promise<InstallActionResult<{ checks: RequirementCheck[]; blocking: boolean }>> {
  try {
    await assertInstallerOpen(databaseUrl);
    const checks = await runRequirementsCheck(databaseUrl);
    return { ok: true, data: { checks, blocking: requirementsBlocking(checks) } };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export async function saveInstallEnvAction(
  input: InstallEnvInput
): Promise<InstallActionResult<{ authSecretGenerated: boolean }>> {
  try {
    await assertInstallerOpen(input.databaseUrl);
    if (!input.databaseUrl.startsWith("postgres")) {
      return fail("DATABASE_URL harus connection string PostgreSQL.");
    }
    if (!input.authSecret || input.authSecret.length < 16) {
      return fail("AUTH_SECRET minimal 16 karakter.");
    }
    if (!input.appUrl.startsWith("http")) {
      return fail("NEXT_PUBLIC_APP_URL harus URL lengkap (https://...).");
    }

    const generated = !input.authSecret;
    const secret = input.authSecret || generateAuthSecret();
    await writeInstallEnv({ ...input, authSecret: secret });

    const checks = await runRequirementsCheck(input.databaseUrl);
    if (requirementsBlocking(checks)) {
      const failed = checks.filter((c) => c.status === "fail").map((c) => c.label);
      return fail(`Requirement gagal: ${failed.join(", ")}`);
    }

    return { ok: true, data: { authSecretGenerated: generated } };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export async function generateAuthSecretAction(): Promise<InstallActionResult<{ secret: string }>> {
  try {
    await assertInstallerOpen();
    return { ok: true, data: { secret: generateAuthSecret() } };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export async function runSchemaMigrationAction(
  databaseUrl: string
): Promise<InstallActionResult<{ alreadyMigrated: boolean }>> {
  try {
    await assertInstallerOpen(databaseUrl);
    const hasTables = await postgresHasMigrations(databaseUrl);
    // Selalu jalankan migrate (idempotent) agar migration baru (0006+) ikut terapkan.
    runPostgresMigrations(databaseUrl);
    return { ok: true, data: { alreadyMigrated: hasTables } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg.slice(0, 500));
  }
}

export async function uploadSqliteBackupAction(
  formData: FormData
): Promise<InstallActionResult<{ tables: { name: string; rows: number }[]; totalRows: number }>> {
  try {
    await assertInstallerOpen();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("File SQLite wajib diunggah.");
    if (!file.name.endsWith(".db")) return fail("File harus berformat .db (SQLite).");
    if (file.size < 1024) return fail("File terlalu kecil — bukan backup SQLite valid.");
    if (file.size > 512 * 1024 * 1024) return fail("File maksimal 512 MB.");

    await ensureInstallDir();
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(SQLITE_UPLOAD, buf);

    const preview = await inspectSqliteFile(SQLITE_UPLOAD);
    return { ok: true, data: preview };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export async function runDataSetupAction(
  databaseUrl: string,
  mode: DataSourceMode
): Promise<
  InstallActionResult<{
    migration?: SqliteMigrationSummary;
    superadminCount: number;
    superadminEmails: string[];
  }>
> {
  try {
    await assertInstallerOpen(databaseUrl);

    const hasTables = await postgresHasMigrations(databaseUrl);
    if (!hasTables) {
      return fail("Schema PostgreSQL belum ada. Jalankan migrasi schema terlebih dahulu.");
    }

    // Pastikan migration terbaru (0006+) sudah terapkan sebelum copy data.
    runPostgresMigrations(databaseUrl);

    let migration: SqliteMigrationSummary | undefined;
    if (mode === "fresh") {
      await seedFreshPlatformData(databaseUrl);
    } else {
      try {
        await readFile(SQLITE_UPLOAD);
      } catch {
        return fail("Upload file SQLite terlebih dahulu.");
      }
      migration = await migrateSqliteFileToPostgres(SQLITE_UPLOAD, databaseUrl);
    }

    const superadminCount = await countSuperadmins(databaseUrl);
    const superadminEmails = superadminCount > 0 ? await getSuperadminEmails(databaseUrl) : [];

    return { ok: true, data: { migration, superadminCount, superadminEmails } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg.slice(0, 500));
  }
}

export async function createSuperadminAction(
  databaseUrl: string,
  input: SuperadminInput
): Promise<InstallActionResult<{ email: string }>> {
  try {
    await assertInstallerOpen(databaseUrl);
    const existing = await countSuperadmins(databaseUrl);
    if (existing > 0) {
      return fail("Superadmin sudah ada. Lanjutkan ke langkah selesai.");
    }
    const email = await createSuperadminUser(databaseUrl, input);
    return { ok: true, data: { email } };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export async function finishInstallAction(
  databaseUrl: string,
  superadminEmail: string
): Promise<InstallActionResult<{ loginUrl: string }>> {
  try {
    await assertInstallerOpen(databaseUrl);
    const count = await countSuperadmins(databaseUrl);
    if (count === 0) {
      return fail("Buat akun superadmin terlebih dahulu.");
    }

    await writeInstallLock({
      installedAt: new Date().toISOString(),
      version: pkgVersion(),
      superadminEmail: superadminEmail.trim().toLowerCase(),
    });

    const env = await readEnvFile();
    const appUrl = env.get("NEXT_PUBLIC_APP_URL")?.replace(/\/$/, "") ?? "";
    return { ok: true, data: { loginUrl: appUrl ? `${appUrl}/login` : "/login" } };
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}
