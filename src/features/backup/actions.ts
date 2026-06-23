"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { exportTenantBackup } from "./export";
import {
  backupToPreview,
  restoreTenantBackup,
  validateBackupPayload,
} from "./import";
import { assertRestoreRateLimit } from "./rate-limit";
import { backupToDownloadBytes, parseBackupBuffer } from "./snapshot";
import type { BackupPreview, RestoreResult, TenantBackupPayload } from "./types";

export type ExportBackupState = ActionState & {
  download?: { filename: string; base64: string; mimeType: string };
  counts?: TenantBackupPayload["counts"];
};

export type PreviewBackupState = ActionState & {
  preview?: BackupPreview;
  backupJson?: string;
};

export type RestoreBackupState = ActionState & {
  result?: RestoreResult;
};

async function readUploadFile(formData: FormData): Promise<{ buffer: Buffer; gzip: boolean }> {
  const file = formData.get("backupFile");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pilih file backup (.netmanage.json atau .json.gz).");
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error("File backup terlalu besar (maks. 50 MB).");
  }
  const name = file.name.toLowerCase();
  const gzip = name.endsWith(".gz");
  const bytes = await file.arrayBuffer();
  return { buffer: Buffer.from(bytes), gzip };
}

async function payloadFromForm(
  formData: FormData,
  tenantId: string
): Promise<TenantBackupPayload> {
  const jsonRaw = String(formData.get("backupJson") ?? "").trim();
  if (jsonRaw) {
    let parsed: unknown = JSON.parse(jsonRaw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return validateBackupPayload(parsed, tenantId);
  }
  const { buffer, gzip } = await readUploadFile(formData);
  return validateBackupPayload(parseBackupBuffer(buffer, gzip), tenantId);
}

export async function exportTenantBackupAction(): Promise<ExportBackupState> {
  const user = await requireUser(["owner", "admin"]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };

  const payload = await exportTenantBackup(user.tenantId);
  const gzip = payload.counts.pelanggan > 500;
  const bytes = backupToDownloadBytes(payload, gzip);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `backup-${payload.tenantDomain}-${stamp}.netmanage.json${gzip ? ".gz" : ""}`;

  return {
    ok: true,
    counts: payload.counts,
    download: {
      filename,
      base64: bytes.toString("base64"),
      mimeType: gzip ? "application/gzip" : "application/json",
    },
  };
}

export async function previewTenantBackupAction(
  _prev: PreviewBackupState,
  formData: FormData
): Promise<PreviewBackupState> {
  const user = await requireUser(["owner"]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };

  try {
    const { buffer, gzip } = await readUploadFile(formData);
    const payload = parseBackupBuffer(buffer, gzip);
    validateBackupPayload(payload, user.tenantId);
    return {
      ok: true,
      preview: backupToPreview(payload),
      backupJson: gzip ? undefined : JSON.stringify(payload),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal membaca backup." };
  }
}

export async function restoreTenantBackupAction(
  _prev: RestoreBackupState,
  formData: FormData
): Promise<RestoreBackupState> {
  const mode = String(formData.get("mode") ?? "") as "merge" | "replace";
  if (mode !== "merge" && mode !== "replace") {
    return { error: "Mode restore tidak valid." };
  }

  const user = await requireUser(["owner"]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };

  if (mode === "replace") {
    const confirm = String(formData.get("confirmNamaUsaha") ?? "").trim();
    const expected = String(formData.get("expectedNamaUsaha") ?? "").trim();
    if (!confirm || confirm !== expected) {
      return { error: "Konfirmasi nama usaha tidak cocok." };
    }
  }

  try {
    const payload = await payloadFromForm(formData, user.tenantId);
    await assertRestoreRateLimit(user.tenantId);
    const result = await restoreTenantBackup(user.tenantId, payload, mode);

    revalidatePath("/isp");
    revalidatePath("/isp/pengaturan");
    revalidatePath("/isp/pengaturan/backup");
    revalidatePath("/isp/pelanggan");
    revalidatePath("/isp/invoice");

    return { ok: true, result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Restore gagal." };
  }
}
