"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import {
  exportTenantBackupAction,
  previewTenantBackupAction,
  restoreTenantBackupAction,
  type PreviewBackupState,
  type RestoreBackupState,
} from "@/features/backup/actions";
import type { BackupPreview, TenantBackupCounts } from "@/features/backup/types";
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

  useEffect(() => {
    if (previewState.ok && previewState.preview) {
      toast({ title: "Pratinjau backup siap", variant: "success" });
    }
    if (previewState.error) toast({ title: previewState.error, variant: "error" });
  }, [previewState.ok, previewState.error, previewState.preview, toast]);

  useEffect(() => {
    if (restoreState.ok && restoreState.result) {
      toast({ title: "Restore selesai", variant: "success" });
      setConfirmName("");
    }
    if (restoreState.error) toast({ title: restoreState.error, variant: "error" });
  }, [restoreState.ok, restoreState.error, restoreState.result, toast]);

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
            <input
              name="backupFile"
              type="file"
              accept=".json,.gz,.netmanage.json,application/json,application/gzip"
              className="block w-full text-sm"
              required
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

              <form action={restoreAction} className="space-y-3">
                {backupJson ? (
                  <input type="hidden" name="backupJson" value={backupJson} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Upload ulang file yang sama untuk restore file gzip:
                  </p>
                )}
                {!backupJson && (
                  <input
                    name="backupFile"
                    type="file"
                    accept=".gz,.json.gz,application/gzip"
                    className="block w-full text-sm"
                    required
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

          {restoreState.result && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950/30">
              <p className="font-medium">Restore {restoreState.result.mode} selesai</p>
              {Object.keys(restoreState.result.inserted).length > 0 && (
                <p className="mt-1 text-muted-foreground">
                  Ditambahkan:{" "}
                  {Object.entries(restoreState.result.inserted)
                    .map(([k, v]) => `${COUNT_LABELS[k as keyof TenantBackupCounts] ?? k}: ${v}`)
                    .join(", ")}
                </p>
              )}
              {Object.keys(restoreState.result.skipped).length > 0 && (
                <p className="text-muted-foreground">
                  Dilewati (sudah ada):{" "}
                  {Object.entries(restoreState.result.skipped)
                    .map(([k, v]) => `${COUNT_LABELS[k as keyof TenantBackupCounts] ?? k}: ${v}`)
                    .join(", ")}
                </p>
              )}
            </div>
          )}
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
