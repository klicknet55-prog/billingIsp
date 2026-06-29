"use client";

import { FileUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CSV_IMPORT_MAX_ROWS } from "@/features/customers/csv-import";
import {
  getPelangganImportStatusAction,
  previewPelangganImportAction,
  runPelangganImportAction,
} from "@/features/customers/import-actions";
import type { ImportMode, ImportPreviewRow } from "@/features/customers/import-service";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "running" | "done";

export function PelangganImportDialog() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ImportMode>("skip");
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [message, setMessage] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [runTotal, setRunTotal] = useState(0);
  const [runSuccess, setRunSuccess] = useState(0);
  const [runFailed, setRunFailed] = useState(0);
  const [runStatus, setRunStatus] = useState<string>("queued");
  const [rowResults, setRowResults] = useState<
    Array<{
      line: number;
      nama: string;
      noWa: string;
      ok: boolean;
      error?: string;
      warning?: string;
    }>
  >([]);

  const reset = useCallback(() => {
    setStep("upload");
    setCsvText("");
    setFileName("");
    setMode("skip");
    setPreviewRows([]);
    setValidCount(0);
    setErrorCount(0);
    setMessage("");
    setBatchId(null);
    setRunTotal(0);
    setRunSuccess(0);
    setRunFailed(0);
    setRunStatus("queued");
    setRowResults([]);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    setStep("upload");
    setPreviewRows([]);
  };

  const onPreview = async () => {
    if (!csvText.trim()) {
      setMessage("Pilih file CSV terlebih dahulu.");
      return;
    }
    setMessage("Memvalidasi...");
    const result = await previewPelangganImportAction(csvText);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setPreviewRows(result.rows);
    setValidCount(result.validCount);
    setErrorCount(result.errorCount);
    setStep("preview");
    setMessage("");
  };

  const onRun = async () => {
    if (validCount === 0) {
      setMessage("Tidak ada baris valid untuk diimport.");
      return;
    }
    setMessage("Memulai import...");
    const result = await runPelangganImportAction({ csvText, mode });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setBatchId(result.batchId);
    setRunTotal(result.total);
    setStep("running");
    setMessage("");
  };

  useEffect(() => {
    if (step !== "running" || !batchId) return;

    let cancelled = false;

    const poll = async () => {
      const result = await getPelangganImportStatusAction(batchId);
      if (cancelled || !result.ok) return;

      setRunStatus(result.status);
      setRunSuccess(result.success);
      setRunFailed(result.failed);
      setRowResults(result.rowResults);

      if (result.done) {
        setStep("done");
        if (result.error) setMessage(result.error);
        router.refresh();
        return;
      }

      window.setTimeout(poll, 1500);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [step, batchId, router]);

  const running = step === "running";
  const showResults = step === "done" && rowResults.length > 0;

  return (
    <Dialog
      trigger={
        <Button size="sm" variant="outline">
          <Upload />
          Import CSV
        </Button>
      }
      title="Import Pelanggan CSV"
      description={`Unggah file CSV (maks. ${CSV_IMPORT_MAX_ROWS} baris). Kolom wajib: nama, noWa.`}
      className="max-w-3xl"
      dismissible={!running}
    >
      {(closeDialog) => (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <a href="/dashboard/pelanggan/import/template" download>
                Unduh template CSV
              </a>
            </Button>
          </div>

          {(step === "upload" || step === "preview") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="csv-file">File CSV</Label>
                <input
                  ref={fileRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5"
                  onChange={onFileChange}
                />
                {fileName && (
                  <p className="text-xs text-muted-foreground">
                    <FileUp className="mr-1 inline size-3" />
                    {fileName}
                  </p>
                )}
              </div>

              {step === "preview" && (
                <>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="success">{validCount} valid</Badge>
                    {errorCount > 0 && <Badge variant="destructive">{errorCount} error</Badge>}
                  </div>

                  <div className="max-h-64 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row) => (
                          <TableRow key={row.line}>
                            <TableCell>{row.line}</TableCell>
                            <TableCell>{row.nama || "-"}</TableCell>
                            <TableCell>{row.noWa || "-"}</TableCell>
                            <TableCell>
                              {row.valid ? (
                                <span className="text-emerald-600">OK</span>
                              ) : (
                                <span className="text-destructive" title={row.errors.join(" ")}>
                                  {row.errors[0]}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="import-mode">Mode error</Label>
                    <Select
                      id="import-mode"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as ImportMode)}
                    >
                      <option value="skip">Skip baris error, lanjutkan sisanya</option>
                      <option value="stop">Stop saat menemukan error</option>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {running && (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-sm font-medium">Import sedang berjalan...</p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full bg-primary transition-all duration-500",
                    runStatus === "running" ? "w-2/3 animate-pulse" : "w-1/3"
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Status: {runStatus} · {runSuccess} sukses · {runFailed} gagal · {runTotal} total
              </p>
            </div>
          )}

          {showResults && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{runSuccess} sukses</Badge>
                {runFailed > 0 && <Badge variant="destructive">{runFailed} gagal</Badge>}
              </div>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Hasil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowResults.map((row) => (
                      <TableRow key={row.line}>
                        <TableCell>{row.line}</TableCell>
                        <TableCell>{row.nama}</TableCell>
                        <TableCell>
                          {row.ok ? (
                            <span className="text-emerald-600">
                              OK{row.warning ? ` (${row.warning})` : ""}
                            </span>
                          ) : (
                            <span className="text-destructive">{row.error}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-destructive">{message}</p>}

          <div className="flex justify-end gap-2 border-t pt-4">
            {step === "upload" && (
              <>
                <Button type="button" variant="ghost" onClick={() => { reset(); closeDialog(); }}>
                  Batal
                </Button>
                <Button type="button" onClick={onPreview} disabled={!csvText.trim()}>
                  Preview
                </Button>
              </>
            )}
            {step === "preview" && (
              <>
                <Button type="button" variant="ghost" onClick={() => setStep("upload")}>
                  Kembali
                </Button>
                <Button type="button" onClick={onRun} disabled={validCount === 0}>
                  Import {validCount} baris
                </Button>
              </>
            )}
            {running && (
              <Button type="button" variant="ghost" disabled>
                Tunggu selesai...
              </Button>
            )}
            {step === "done" && (
              <Button
                type="button"
                onClick={() => {
                  reset();
                  closeDialog();
                }}
              >
                Tutup
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
