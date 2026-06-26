"use server";

import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import {
  cleanupFullBackup,
  exportFullDatabaseBackup,
  fullBackupMimeType,
  readFullBackupFile,
} from "./full-backup";

export type FullBackupState = ActionState & {
  download?: { filename: string; base64: string; mimeType: string };
};

export async function exportFullDatabaseAction(): Promise<FullBackupState> {
  await requireUser(["superadmin"]);

  try {
    const { filePath, filename } = await exportFullDatabaseBackup();
    const buf = await readFullBackupFile(filename);
    await cleanupFullBackup(filePath);
    return {
      ok: true,
      download: {
        filename,
        base64: buf.toString("base64"),
        mimeType: fullBackupMimeType(filename),
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Backup database gagal.",
    };
  }
}
