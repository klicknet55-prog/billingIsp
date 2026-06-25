"use client";

import { RefreshCw, Rocket, Trash2 } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import {
  clearDeployLogsAction,
  getDeployStatusAction,
  startDeployAction,
} from "@/features/platform-deploy/actions";
import { deployStepLabel, type DeployInfo } from "@/features/platform-deploy/types";
import { formatDate } from "@/lib/utils";

const initial: ActionState = {};

const statusVariant = {
  idle: "secondary",
  running: "warning",
  success: "success",
  failed: "destructive",
} as const;

const statusLabel = {
  idle: "Siap",
  running: "Berjalan",
  success: "Sukses",
  failed: "Gagal",
} as const;

export function DeployPanel({ initialInfo }: { initialInfo: DeployInfo }) {
  const [info, setInfo] = useState(initialInfo);
  const [state, action] = useActionState(startDeployAction, initial);
  const [, startRefresh] = useTransition();
  const [clearing, startClear] = useTransition();
  const { toast } = useToast();

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const next = await getDeployStatusAction();
      setInfo(next);
    });
  }, [startRefresh]);

  function handleClearLogs() {
    if (info.status === "running") return;
    if (
      !window.confirm(
        "Hapus log deploy dan reset status? Riwayat langkah deploy akan dibersihkan."
      )
    ) {
      return;
    }
    startClear(async () => {
      const result = await clearDeployLogsAction();
      if (result.ok) {
        toast({ title: "Log deploy dibersihkan", variant: "success" });
        refresh();
      } else if (result.error) {
        toast({ title: result.error, variant: "error" });
      }
    });
  }

  useEffect(() => {
    if (info.status !== "running") return;
    const id = window.setInterval(refresh, 2500);
    return () => window.clearInterval(id);
  }, [info.status, refresh]);

  useEffect(() => {
    if (state.ok) refresh();
  }, [state.ok, refresh]);

  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">Versi git (HEAD)</p>
          <p className="font-mono font-medium">{info.git.commit ?? "—"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{info.git.message ?? ""}</p>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">Branch</p>
          <p className="font-medium">{info.git.branch ?? info.branch ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">Deploy terakhir</p>
          <p className="font-medium">
            {info.finishedAt
              ? formatDate(info.finishedAt)
              : info.startedAt
                ? "Berjalan…"
                : "Belum pernah"}
          </p>
          {info.startedBy && (
            <p className="mt-1 text-xs text-muted-foreground">oleh {info.startedBy}</p>
          )}
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-muted-foreground">Status</p>
          <Badge variant={statusVariant[info.status]} className="mt-1">
            {statusLabel[info.status]}
          </Badge>
          {info.commitBefore && info.commitAfter && info.commitBefore !== info.commitAfter && (
            <p className="mt-1 text-xs text-muted-foreground">
              {info.commitBefore} → {info.commitAfter}
            </p>
          )}
        </div>
      </div>

      {!info.enabled && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
          Fitur update dinonaktifkan. Production: set{" "}
          <code className="rounded bg-muted px-1">DEPLOY_ENABLED=true</code> di{" "}
          <code className="rounded bg-muted px-1">.env</code>, lalu restart PM2 sekali manual.
        </p>
      )}

      {info.steps.length > 0 && (
        <ol className="space-y-2 text-sm">
          {info.steps.map((step) => (
            <li
              key={step.name}
              className="flex items-center justify-between gap-2 rounded border px-3 py-2"
            >
              <span>{deployStepLabel(step.name)}</span>
              <span className="text-muted-foreground capitalize">{step.status}</span>
            </li>
          ))}
        </ol>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {info.error && info.status === "failed" && (
        <p className="text-sm text-destructive">{info.error}</p>
      )}

      <form action={action} className="space-y-4 rounded-lg border bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          <h3 className="font-semibold">Jalankan update aplikasi</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Proses: backup DB → git pull → npm ci → patch schema → build → restart PM2. Aplikasi
          akan offline singkat saat restart (±30 detik).
        </p>
        <div className="space-y-2">
          <Label htmlFor="confirm">Ketik DEPLOY untuk konfirmasi</Label>
          <Input
            id="confirm"
            name="confirm"
            placeholder="DEPLOY"
            autoComplete="off"
            disabled={!info.enabled || info.status === "running"}
          />
          {fe.confirm && <p className="text-xs text-destructive">{fe.confirm}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <SubmitButton disabled={!info.enabled || info.status === "running"}>
            {info.status === "running" ? "Deploy berjalan…" : "Update Aplikasi"}
          </SubmitButton>
          <Button type="button" variant="outline" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh status
          </Button>
        </div>
      </form>

      {(info.logTail || info.steps.length > 0 || info.status !== "idle") && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Log deploy</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refresh}
              >
                <RefreshCw className="size-4" /> Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={info.status === "running" || clearing}
                onClick={handleClearLogs}
              >
                <Trash2 className="size-4" /> Hapus log
              </Button>
            </div>
          </div>
          {info.logTail ? (
            <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
              {info.logTail}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">Log kosong.</p>
          )}
        </div>
      )}
    </div>
  );
}
