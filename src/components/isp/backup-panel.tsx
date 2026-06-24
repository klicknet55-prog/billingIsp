"use client";

import { Upload } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import {
  exportTenantBackupAction,
  previewTenantBackupAction,
  restoreTenantBackupAction,
  type PreviewBackupState,
  type RestoreBackupState,
} from "@/features/backup/actions";
import type { BackupPreview, RestoreResult, TenantBackupCounts } from "@/features/backup/types";
import { formatDate } from "@/lib/utils";

const previewInitial: PreviewBackupState = {};
const restoreInitial: RestoreBackupState = {};

const COUNT_LABELS: Record<keyof TenantBackupCounts, string> = {
  users: "Staf",
  routers: "Router",
  paketInternet: "Paket internet",
  odp: "ODP",
  pelanggan: "Pelanggan",
  invoices: "Invoice",
  tickets: "Tiket",
  ticketAssignments: "Assignment tiket",
  kategoriPengeluaran: "Kategori pengeluaran",
  pengeluaran: "Pengeluaran",
};

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

function CountsTable({ counts }: { counts: BackupPreview["counts"] }) {
  const rows = Object.entries(counts) as [keyof TenantBackupCounts, number][];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-muted-foreground">{COUNT_LABELS[k] ?? k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatCountSummary(counts: Partial<TenantBackupCounts>): string {
  const rows = Object.entries(counts).filter(([, v]) => (v ?? 0) > 0) as [
    keyof TenantBackupCounts,
    number,
  ][];
  if (rows.length === 0) return "";
  return rows.map(([k, v]) => `${COUNT_LABELS[k] ?? k}: ${v}`).join(", ");
}

function restoreSuccessMessage(result: RestoreResult): { title: string; description: string } {
  const modeLabel = result.mode === "replace" ? "Ganti semua data" : "Gabungkan";
  const inserted = formatCountSummary(result.inserted);
  const skipped = formatCountSummary(result.skipped);
  const parts: string[] = [`Mode: ${modeLabel}.`];
  if (inserted) parts.push(`Ditambahkan: ${inserted}.`);
  if (skipped) parts.push(`Dilewati (sudah ada): ${skipped}.`);
  if (!inserted && !skipped) parts.push("Tidak ada data baru yang diimpor.");
  return {
    title: "Restore berhasil",
    description: parts.join(" "),
  };
}

function RestoreNotice({ state }: { state: RestoreBackupState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
      >
        <p className="font-medium text-destructive">Restore gagal</p>
        <p className="mt-1 text-muted-foreground">{state.error}</p>
      </div>
    );
  }

  if (state.ok && state.result) {
    const { title, description } = restoreSuccessMessage(state.result);
    return (
      <div
        role="status"
        className="rounded-md border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/30"
      >
        <p className="font-medium text-green-800 dark:text-green-300">{title}</p>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
    );
  }

  return null;
}

function BackupFileField({
  name,
  accept,
  required,
  label = "Pilih file backup",
  description = "Belum ada file dipilih",
}: {
  name: string;
  accept: string;
  required?: boolean;
  label?: string;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4">
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setFileName(file?.name ?? null);
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload />
          {label}
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {fileName ?? "Belum ada file dipilih"}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function BackupPanel({
  namaUsaha,
  isOwner,
  snapshots,
}: {
  namaUsaha: string;
  isOwner: boolean;
  snapshots: { filename: string; mtime: Date; size: number }[];
}) {
  const { toast } = useToast();
  const [exporting, startExport] = useTransition();
  const [previewState, previewAction] = useActionState(previewTenantBackupAction, previewInitial);
  const [restoreState, restoreAction] = useActionState(restoreTenantBackupAction, restoreInitial);
  const [confirmName, setConfirmName] = useState("");
  const lastPreviewNotice = useRef<string | null>(null);
  const lastRestoreNotice = useRef<string | null>(null);

  useEffect(() => {
    if (previewState.ok && previewState.preview) {
      const key = `preview:${previewState.preview.exportedAt}`;
      if (lastPreviewNotice.current === key) return;
      lastPreviewNotice.current = key;
      toast({
        title: "Pratinjau backup siap",
        description: `${previewState.preview.namaUsaha} · ${previewState.preview.counts.pelanggan} pelanggan`,
        variant: "success",
      });
    }
    if (previewState.error) {
      const key = `preview-err:${previewState.error}`;
      if (lastPreviewNotice.current === key) return;
      lastPreviewNotice.current = key;
      toast({
        title: "Pratinjau gagal",
        description: previewState.error,
        variant: "error",
      });
    }
  }, [previewState.ok, previewState.error, previewState.preview, toast]);

  useEffect(() => {
    if (restoreState.error) {
      const key = `restore-err:${restoreState.error}`;
      if (lastRestoreNotice.current === key) return;
      lastRestoreNotice.current = key;
      toast({
        title: "Restore gagal",
        description: restoreState.error,
        variant: "error",
      });
    } else if (restoreState.ok && restoreState.result) {
      const { title, description } = restoreSuccessMessage(restoreState.result);
      const key = `restore-ok:${restoreState.result.mode}:${description}`;
      if (lastRestoreNotice.current === key) return;
      lastRestoreNotice.current = key;
      toast({ title, description, variant: "success" });
      setConfirmName("");
    }
  }, [restoreState.ok, restoreState.error, restoreState.result, toast]);

  const handleRestoreSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const mode = submitter instanceof HTMLButtonElement ? submitter.value : "";
    if (mode === "replace" && confirmName.trim() !== namaUsaha) {
      event.preventDefault();
      toast({
        title: "Restore gagal",
        description: "Ketik nama usaha persis untuk mode Ganti semua data.",
        variant: "error",
      });
    }
  };

  const handleExport = () => {
    startExport(async () => {
      const res = await exportTenantBackupAction();
      if (res.error) {
        toast({ title: res.error, variant: "error" });
        return;
      }
      if (res.download) {
        downloadBase64(res.download.filename, res.download.base64, res.download.mimeType);
        toast({ title: "Backup diunduh", variant: "success" });
      }
    });
  };

  const preview = previewState.preview;
  const backupJson = previewState.backupJson;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-semibold">Export data</h3>
        <p className="text-sm text-muted-foreground">
          Unduh backup JSON berisi pelanggan, invoice, router, ODP, tiket, staf, dan konfigurasi
          integrasi tenant Anda.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {exporting ? "Menyiapkan…" : "Unduh backup"}
        </button>
      </section>

      {isOwner && (
        <section className="space-y-3 border-t pt-6">
          <h3 className="font-semibold">Restore data</h3>
          <p className="text-sm text-muted-foreground">
            Upload file <code className="text-xs">.netmanage.json</code> atau{" "}
            <code className="text-xs">.json.gz</code>. Maks. 50 MB.
          </p>

          <form action={previewAction} className="space-y-3">
            <BackupFileField
              name="backupFile"
              accept=".json,.gz,.netmanage.json,application/json,application/gzip"
              required
              label="Pilih file backup"
              description="Format .netmanage.json atau .json.gz, maks. 50 MB"
            />
            <SubmitButton variant="outline">Pratinjau</SubmitButton>
          </form>

          {preview && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div>
                <p className="font-medium">{preview.namaUsaha}</p>
                <p className="text-xs text-muted-foreground">
                  Export: {formatDate(preview.exportedAt)} · Domain: {preview.tenantDomain}
                </p>
              </div>
              <CountsTable counts={preview.counts} />

              <form action={restoreAction} onSubmit={handleRestoreSubmit} className="space-y-3">
                {backupJson ? (
                  <input type="hidden" name="backupJson" value={backupJson} />
                ) : (
                  <BackupFileField
                    name="backupFile"
                    accept=".gz,.json.gz,application/gzip"
                    required
                    label="Pilih file gzip"
                    description="Upload ulang file backup yang sama"
                  />
                )}
                <input type="hidden" name="expectedNamaUsaha" value={namaUsaha} />

                <div className="flex flex-wrap gap-2">
                  <SubmitButton variant="outline" name="mode" value="merge">
                    Gabungkan
                  </SubmitButton>
                  <SubmitButton variant="destructive" name="mode" value="replace">
                    Ganti semua data
                  </SubmitButton>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    Untuk &quot;Ganti semua data&quot;, ketik nama usaha: {namaUsaha}
                  </label>
                  <input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    name="confirmNamaUsaha"
                    className="h-9 w-full max-w-md rounded-md border px-3 text-sm"
                    placeholder={namaUsaha}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Backup otomatis disimpan di server sebelum data diganti.
                  </p>
                </div>
              </form>
            </div>
          )}

          <RestoreNotice state={restoreState} />
        </section>
      )}

      {!isOwner && (
        <p className="border-t pt-6 text-sm text-muted-foreground">
          Restore hanya tersedia untuk owner. Admin dapat mengunduh backup saja.
        </p>
      )}

      {snapshots.length > 0 && (
        <section className="space-y-2 border-t pt-6">
          <h3 className="font-semibold">Snapshot otomatis (server)</h3>
          <p className="text-xs text-muted-foreground">
            Disimpan otomatis sebelum restore &quot;Ganti semua data&quot;.
          </p>
          <ul className="space-y-1 text-sm">
            {snapshots.map((s) => (
              <li key={s.filename} className="text-muted-foreground">
                {s.filename} · {formatDate(s.mtime)} · {(s.size / 1024).toFixed(1)} KB
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
