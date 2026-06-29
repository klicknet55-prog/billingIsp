"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { enqueuePelangganImport } from "@/features/jobs/enqueue";
import { parseCsvText } from "./csv-import";
import {
  createImportBatch,
  getImportBatchStatus,
  previewPelangganCsvImport,
  type ImportMode,
} from "./import-service";

const ISP_ROLES = ["owner", "admin"] as const;

export async function previewPelangganImportAction(csvText: string) {
  const user = await requireUser(ISP_ROLES);
  try {
    const result = await previewPelangganCsvImport(user.tenantId!, csvText);
    return { ok: true as const, ...result };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Gagal memparse CSV.",
    };
  }
}

export async function runPelangganImportAction(input: { csvText: string; mode: ImportMode }) {
  const user = await requireUser(ISP_ROLES);
  try {
    const parsed = parseCsvText(input.csvText);
    if (parsed.length === 0) {
      return { ok: false as const, error: "File CSV kosong atau tidak valid." };
    }

    const batchId = await createImportBatch({
      tenantId: user.tenantId!,
      createdBy: user.id,
      csvText: input.csvText,
      mode: input.mode,
      total: parsed.length,
    });

    await enqueuePelangganImport(batchId);
    return { ok: true as const, batchId, total: parsed.length };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Gagal memulai import.",
    };
  }
}

export async function getPelangganImportStatusAction(batchId: string) {
  const user = await requireUser(ISP_ROLES);
  const batch = await getImportBatchStatus(user.tenantId!, batchId);
  if (!batch) {
    return { ok: false as const, error: "Batch tidak ditemukan." };
  }

  if (batch.status === "completed") {
    revalidatePath("/dashboard/pelanggan");
  }

  const done = batch.status === "completed" || batch.status === "failed";

  return {
    ok: true as const,
    status: batch.status,
    total: batch.total,
    success: batch.success,
    failed: batch.failed,
    done,
    rowResults: batch.rowResults ?? [],
    error: batch.error,
  };
}
