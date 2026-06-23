"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { exportFullDatabaseAction } from "@/features/backup/full-backup-actions";

function downloadBase64(filename: string, base64: string, mimeType: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FullBackupPanel() {
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const handleExport = () => {
    start(async () => {
      const res = await exportFullDatabaseAction();
      if (res.error) {
        toast({ title: res.error, variant: "error" });
        return;
      }
      if (res.download) {
        downloadBase64(res.download.filename, res.download.base64, res.download.mimeType);
        toast({ title: "Backup database diunduh", variant: "success" });
      }
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Unduh snapshot SQLite lengkap (semua tenant, superadmin, dan konfigurasi platform).
        Simpan file di lokasi aman — berisi data sensitif termasuk password terenkripsi.
      </p>
      <button
        type="button"
        onClick={handleExport}
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Menyiapkan…" : "Unduh backup database (.db)"}
      </button>
    </div>
  );
}
