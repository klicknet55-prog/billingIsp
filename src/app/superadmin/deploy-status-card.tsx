"use client";

import Link from "next/link";
import { Loader2, Rocket } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDeployStatusAction } from "@/features/platform-deploy/actions";
import { deployStepLabel, type DeployInfo } from "@/features/platform-deploy/types";
import { formatDate } from "@/lib/utils";

const statusVariant = {
  idle: "secondary",
  running: "warning",
  success: "success",
  failed: "destructive",
} as const;

const statusLabel = {
  idle: "Siap",
  running: "Deploy berjalan",
  success: "Deploy sukses",
  failed: "Deploy gagal",
} as const;

const stepVariant = {
  pending: "secondary",
  running: "warning",
  ok: "success",
  failed: "destructive",
} as const;

export function DeployStatusCard({ initialInfo }: { initialInfo: DeployInfo }) {
  const [info, setInfo] = useState(initialInfo);
  const [, startRefresh] = useTransition();

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const next = await getDeployStatusAction();
      setInfo(next);
    });
  }, [startRefresh]);

  useEffect(() => {
    if (info.status !== "running") return;
    const id = window.setInterval(refresh, 2500);
    return () => window.clearInterval(id);
  }, [info.status, refresh]);

  const completedSteps = info.steps.filter((s) => s.status === "ok").length;
  const totalSteps = info.steps.length;
  const runningStep = info.steps.find((s) => s.status === "running");

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            {info.status === "running" ? (
              <Loader2 className="size-5 animate-spin text-amber-600" />
            ) : (
              <Rocket className="size-5" />
            )}
            Update Aplikasi
          </CardTitle>
          <CardDescription>
            Deploy manual dari GitHub — hanya superadmin. Versi saat ini{" "}
            <code className="rounded bg-muted px-1">{info.git.commit ?? "—"}</code>
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/superadmin/deploy">Kelola update</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={statusVariant[info.status]}>{statusLabel[info.status]}</Badge>
          {info.updateCheck && (
            <Badge variant={info.updateCheck.available ? "warning" : "success"}>
              {info.updateCheck.available
                ? `Update: ${info.updateCheck.remoteCommit}`
                : "Versi terbaru"}
            </Badge>
          )}
          {!info.enabled && (
            <span className="text-muted-foreground">
              Set <code className="rounded bg-muted px-1">DEPLOY_ENABLED=true</code> di production
            </span>
          )}
          {info.startedAt && info.status === "running" && (
            <span className="text-muted-foreground">
              Dimulai {formatDate(info.startedAt)}
              {info.startedBy ? ` · ${info.startedBy}` : ""}
            </span>
          )}
          {info.finishedAt && info.status !== "running" && (
            <span className="text-muted-foreground">
              Terakhir: {formatDate(info.finishedAt)}
              {info.startedBy ? ` · ${info.startedBy}` : ""}
            </span>
          )}
          {info.commitBefore && info.commitAfter && info.commitBefore !== info.commitAfter && (
            <span className="font-mono text-xs text-muted-foreground">
              {info.commitBefore} → {info.commitAfter}
            </span>
          )}
        </div>

        {info.status === "running" && totalSteps > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {runningStep
                  ? `Sedang: ${deployStepLabel(runningStep.name)}`
                  : "Memproses…"}
              </span>
              <span className="text-muted-foreground">
                {completedSteps}/{totalSteps} langkah
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: `${totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {info.steps.length > 0 && (
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {info.steps.map((step) => (
              <li
                key={step.name}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate">{deployStepLabel(step.name)}</span>
                <Badge variant={stepVariant[step.status]} className="shrink-0 capitalize">
                  {step.status === "ok" ? "selesai" : step.status}
                </Badge>
              </li>
            ))}
          </ol>
        )}

        {info.error && info.status === "failed" && (
          <p className="text-sm text-destructive">{info.error}</p>
        )}

        {info.status === "running" && info.logTail && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Log terbaru</p>
            <pre className="max-h-32 overflow-auto rounded-md border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
              {info.logTail.split("\n").slice(-8).join("\n")}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
