"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getBatchStatusAction } from "@/features/messages/actions";
import type { MessageBatch } from "@/lib/db/schema";

const POLL_MS = 2500;

export function BatchProgress({
  batchId,
  onDone,
}: {
  batchId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [batch, setBatch] = useState<MessageBatch | null>(null);
  const timerRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const next = await getBatchStatusAction(batchId);
        if (!active) return;
        setBatch(next);
        if (next && (next.status === "done" || next.status === "failed")) {
          onDoneRef.current?.();
          router.refresh();
          return;
        }
      } catch {
        if (!active) return;
      }
      timerRef.current = window.setTimeout(poll, POLL_MS);
    };

    poll();

    return () => {
      active = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [batchId, router]);

  if (!batch) return <p className="text-sm text-muted-foreground">Memuat status batch…</p>;

  const pct = batch.total > 0 ? Math.round(((batch.sent + batch.failed) / batch.total) * 100) : 0;

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Progress kirim massal</p>
        <Badge
          variant={
            batch.status === "done"
              ? "success"
              : batch.status === "failed"
                ? "destructive"
                : "warning"
          }
        >
          {batch.status}
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">
        Terkirim: {batch.sent} · Gagal: {batch.failed} · Total: {batch.total}
      </p>
      {batch.status === "queued" && (
        <p className="text-xs text-muted-foreground">Menunggu proses background…</p>
      )}
      {batch.error && <p className="text-sm text-destructive">{batch.error}</p>}
    </div>
  );
}
