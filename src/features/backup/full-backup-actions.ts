"use server";

import { readFile } from "node:fs/promises";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { cleanupFullBackup, exportFullDatabaseBackup } from "./full-backup";

export type FullBackupState = ActionState & {
  download?: { filename: string; base64: string; mimeType: string };
};

export async function exportFullDatabaseAction(): Promise<FullBackupState> {
  await requireUser(["superadmin"]);

  try {
    const { filePath, filename } = await exportFullDatabaseBackup();
    const buf = await readFile(filePath);
    await cleanupFullBackup(filePath);
    return {
      ok: true,
      download: {
        filename,
        base64: buf.toString("base64"),
        mimeType: "application/octet-stream",
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Backup database gagal.",
    };
  }
}
