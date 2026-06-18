"use client";

import { AlertTriangle, Check, Circle, Loader2, Minus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deletePelangganCompleteAction } from "@/features/customers/actions";
import { cn } from "@/lib/utils";

type StepId = "mikrotik" | "invoices" | "tickets" | "pelanggan";
type StepStatus = "pending" | "loading" | "done" | "skipped" | "warning" | "error";
type Phase = "confirm" | "running" | "done" | "error";

interface StepState {
  id: StepId;
  label: string;
  status: StepStatus;
  detail?: string;
}

const STEP_DELAY_MS = 700;

const INITIAL_STEPS: StepState[] = [
  { id: "mikrotik", label: "Cek & hapus user di Mikrotik", status: "pending" },
  { id: "invoices", label: "Hapus invoice terkait", status: "pending" },
  { id: "tickets", label: "Hapus tiket terkait", status: "pending" },
  { id: "pelanggan", label: "Hapus data pelanggan", status: "pending" },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "loading") return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />;
  if (status === "done") return <Check className="size-4 shrink-0 text-emerald-600" />;
  if (status === "skipped") return <Minus className="size-4 shrink-0 text-muted-foreground" />;
  if (status === "warning") return <AlertTriangle className="size-4 shrink-0 text-amber-600" />;
  if (status === "error") return <AlertTriangle className="size-4 shrink-0 text-destructive" />;
  return <Circle className="size-4 shrink-0 text-muted-foreground/40" />;
}

function DeleteProgress({ steps, phase }: { steps: StepState[]; phase: Phase }) {
  if (phase === "confirm") return null;

  return (
    <ul className="space-y-3 rounded-lg border bg-muted/30 p-4">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-3 text-sm">
          <StepIcon status={step.status} />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-medium",
                step.status === "pending" && "text-muted-foreground",
                step.status === "error" && "text-destructive"
              )}
            >
              {step.label}
            </p>
            {step.detail && (
              <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PelangganDeleteDialog({
  pelangganId,
  pelangganNama,
  trigger,
}: {
  pelangganId: string;
  pelangganNama: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  const patchStep = useCallback((id: StepId, patch: Partial<StepState>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const resetState = useCallback(() => {
    setPhase("confirm");
    setSteps(INITIAL_STEPS);
    setFatalError(null);
    setShouldRefresh(false);
  }, []);

  const handleClose = useCallback(
    (closeDialog: () => void) => {
      if (phase === "running") return;
      if (shouldRefresh) {
        router.refresh();
      }
      closeDialog();
      resetState();
    },
    [phase, shouldRefresh, router, resetState]
  );

  const runDelete = useCallback(async () => {
    setPhase("running");
    setFatalError(null);
    setShouldRefresh(false);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" as StepStatus })));

    try {
      patchStep("mikrotik", { status: "loading" });
      const result = await deletePelangganCompleteAction(pelangganId);
      const { mikrotik, records } = result;

      patchStep("mikrotik", {
        status: mikrotik.skipped ? "skipped" : mikrotik.ok ? "done" : "warning",
        detail: mikrotik.message,
      });
      await sleep(STEP_DELAY_MS);

      if (!records.ok) {
        patchStep("invoices", { status: "loading" });
        await sleep(STEP_DELAY_MS);
        patchStep("invoices", { status: "error", detail: records.message });
        patchStep("tickets", { status: "error" });
        patchStep("pelanggan", { status: "error" });
        setFatalError(records.message);
        setPhase("error");
        return;
      }

      setShouldRefresh(true);
      const { invoiceCount, ticketCount } = records.stats;

      patchStep("invoices", { status: "loading" });
      await sleep(STEP_DELAY_MS);
      patchStep("invoices", {
        status: "done",
        detail: invoiceCount > 0 ? `${invoiceCount} invoice dihapus` : "Tidak ada invoice",
      });
      await sleep(STEP_DELAY_MS);

      patchStep("tickets", { status: "loading" });
      await sleep(STEP_DELAY_MS);
      patchStep("tickets", {
        status: "done",
        detail: ticketCount > 0 ? `${ticketCount} tiket dihapus` : "Tidak ada tiket",
      });
      await sleep(STEP_DELAY_MS);

      patchStep("pelanggan", { status: "loading" });
      await sleep(STEP_DELAY_MS);
      patchStep("pelanggan", { status: "done", detail: "Data pelanggan dihapus" });
      await sleep(STEP_DELAY_MS);

      setPhase("done");
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : "Penghapusan gagal.");
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "loading" || s.status === "pending"
            ? { ...s, status: "error" as StepStatus }
            : s
        )
      );
      setPhase("error");
    }
  }, [patchStep, pelangganId]);

  const busy = phase === "running";

  return (
    <Dialog
      trigger={
        trigger ?? (
          <Button variant="ghost" size="sm" type="button">
            Hapus
          </Button>
        )
      }
      title="Hapus Pelanggan"
      description="Konfirmasi penghapusan pelanggan dan sinkronisasi Mikrotik."
      className="max-w-md"
      dismissible={!busy}
    >
      {(closeDialog) => (
        <div className="space-y-4">
          {phase === "confirm" && (
            <p className="text-sm text-muted-foreground">
              Pelanggan <strong>{pelangganNama}</strong> akan dihapus dari Mikrotik (jika terhubung),
              beserta semua invoice dan tiket terkait. Tindakan ini tidak dapat dibatalkan.
            </p>
          )}

          {phase === "done" && (
            <p className="text-sm text-emerald-700">Penghapusan selesai.</p>
          )}

          {fatalError && phase === "error" && (
            <p className="text-sm text-destructive">{fatalError}</p>
          )}

          <DeleteProgress steps={steps} phase={phase} />

          <div className="flex justify-end gap-2">
            {phase === "confirm" && (
              <>
                <Button type="button" variant="ghost" onClick={() => handleClose(closeDialog)}>
                  Batal
                </Button>
                <Button type="button" variant="destructive" onClick={() => void runDelete()}>
                  <Trash2 className="size-4" />
                  Hapus
                </Button>
              </>
            )}
            {busy && (
              <Button type="button" variant="ghost" disabled>
                <Loader2 className="size-4 animate-spin" />
                Menghapus…
              </Button>
            )}
            {(phase === "done" || phase === "error") && (
              <Button type="button" onClick={() => handleClose(closeDialog)}>
                Tutup
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
