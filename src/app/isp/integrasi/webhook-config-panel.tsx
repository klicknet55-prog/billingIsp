"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/db/schema";
import type { ActionState } from "@/features/auth/actions";
import {
  saveTenantWebhookConfigAction,
  testTenantWebhookAction,
  type WebhookActionState,
} from "@/features/webhooks/actions";

const initial: WebhookActionState = {};

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "tagihan.paid": "Tagihan lunas",
  "tagihan.partial_paid": "Tagihan dibayar sebagian",
  "pelanggan.isolated": "Pelanggan diisolir",
  "pelanggan.activated": "Pelanggan diaktifkan kembali",
  "webhook.test": "Event uji",
};

type DeliveryRow = {
  id: string;
  event: string;
  success: boolean;
  statusCode: number | null;
  error: string | null;
  durationMs: number | null;
  createdAt: Date;
};

export function WebhookConfigPanel({
  defaults,
  deliveries,
  circuitOpen,
}: {
  defaults: {
    url?: string;
    events: WebhookEvent[];
    isEnabled: boolean;
    hasSecret: boolean;
    failureCount: number;
    lastDeliveryAt: Date | null;
  };
  deliveries: DeliveryRow[];
  circuitOpen: boolean;
}) {
  const [saveState, saveAction] = useActionState(saveTenantWebhookConfigAction, initial);
  const [testState, testAction] = useActionState(testTenantWebhookAction, initial);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (saveState.ok) {
      if (saveState.plainSecret) setRevealedSecret(saveState.plainSecret);
      toast({ title: "Konfigurasi webhook tersimpan", variant: "success" });
    }
    if (saveState.error) toast({ title: saveState.error, variant: "error" });
  }, [saveState.ok, saveState.plainSecret, saveState.error, toast]);

  useEffect(() => {
    if (testState.ok) toast({ title: "Event uji terkirim", variant: "success" });
    if (testState.error) toast({ title: testState.error, variant: "error" });
  }, [testState.ok, testState.error, toast]);

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p>
          NetManage mengirim <code className="text-xs">POST</code> JSON ke URL Anda dengan header{" "}
          <code className="text-xs">X-NetManage-Signature: sha256=…</code>.
        </p>
        <p className="mt-1">
          Verifikasi signature: lihat{" "}
          <code className="text-xs">docs/webhook-verification.md</code> di repo.
        </p>
      </div>

      {revealedSecret && (
        <div className="rounded-md border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Simpan signing secret ini — hanya ditampilkan sekali
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-background px-2 py-1 text-xs">{revealedSecret}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(revealedSecret)}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              Salin
            </button>
            <button
              type="button"
              onClick={() => setRevealedSecret(null)}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {circuitOpen && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Webhook dinonaktifkan sementara ({defaults.failureCount} kegagalan berturut-turut).
          Perbaiki endpoint lalu kirim event uji.
        </p>
      )}

      <form action={saveAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">URL endpoint</label>
          <input
            name="url"
            type="url"
            defaultValue={defaults.url ?? ""}
            placeholder="https://erp-anda.com/webhooks/netmanage"
            className="h-9 w-full rounded-md border px-3 text-sm"
            required
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Event yang dikirim</p>
          <div className="flex flex-wrap gap-4">
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="events"
                  value={ev}
                  defaultChecked={defaults.events.includes(ev)}
                />
                {EVENT_LABELS[ev]}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isEnabled" defaultChecked={defaults.isEnabled} />
          Aktifkan webhook
        </label>

        {defaults.hasSecret && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="regenerateSecret" />
            Regenerasi secret signing (secret lama tidak valid lagi)
          </label>
        )}

        <SubmitButton>Simpan Webhook</SubmitButton>
      </form>

      <form action={testAction}>
        <SubmitButton variant="outline">Kirim event uji</SubmitButton>
      </form>

      {defaults.lastDeliveryAt && (
        <p className="text-xs text-muted-foreground">
          Delivery terakhir: {formatDate(defaults.lastDeliveryAt)}
        </p>
      )}

      {deliveries.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Log delivery terakhir</p>
          <ul className="divide-y rounded-md border text-xs">
            {deliveries.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                <span>
                  {d.event} · {formatDate(d.createdAt)}
                  {d.durationMs != null ? ` · ${d.durationMs}ms` : ""}
                </span>
                <span className={d.success ? "text-green-600" : "text-destructive"}>
                  {d.success ? `OK ${d.statusCode ?? ""}` : d.error ?? "Gagal"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
