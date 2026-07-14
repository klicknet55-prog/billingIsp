"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import {
  createTenantApiKeyAction,
  revokeTenantApiKeyAction,
  type ApiKeyActionState,
} from "@/features/api-keys/actions";
import type { ActionState } from "@/features/auth/actions";

const createInitial: ApiKeyActionState = {};
const revokeInitial: ActionState = {};

type KeyRow = {
  id: string;
  label: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export function ApiKeysPanel({ keys, appUrl }: { keys: KeyRow[]; appUrl: string }) {
  const { toast } = useToast();
  const [createState, createAction] = useActionState(createTenantApiKeyAction, createInitial);
  const [revokeState, revokeAction] = useActionState(revokeTenantApiKeyAction, revokeInitial);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  useEffect(() => {
    if (createState.ok && createState.plainKey) {
      setRevealedKey(createState.plainKey);
      toast({ title: "API key dibuat", variant: "success" });
    }
    if (createState.error) toast({ title: createState.error, variant: "error" });
  }, [createState.ok, createState.plainKey, createState.error, toast]);

  useEffect(() => {
    if (revokeState.ok) toast({ title: "API key dicabut", variant: "success" });
    if (revokeState.error) toast({ title: revokeState.error, variant: "error" });
  }, [revokeState.ok, revokeState.error, toast]);

  async function copyKey() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      toast({ title: "API key disalin", variant: "success" });
    } catch {
      toast({ title: "Gagal menyalin ke clipboard", variant: "error" });
    }
  }

  const base = appUrl.replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <div className="min-w-0 overflow-hidden rounded-md border bg-muted/40 p-4 text-sm">
        <p className="font-medium">REST API v1 (read-only)</p>
        <p className="mt-1 break-words text-muted-foreground">
          Autentikasi: header{" "}
          <code className="break-all text-xs">Authorization: Bearer &lt;api_key&gt;</code>
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-muted-foreground">
          {[
            `${base}/api/v1/health`,
            `${base}/api/v1/pelanggan`,
            `${base}/api/v1/tagihan`,
            `${base}/api/v1/invoice`,
            `${base}/api/v1/router`,
          ].map((url) => (
            <li key={url} className="min-w-0 pl-1">
              <code className="block break-all text-xs">GET {url}</code>
            </li>
          ))}
        </ul>
      </div>

      {revealedKey && (
        <div className="rounded-md border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Simpan API key ini — hanya ditampilkan sekali
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-background px-2 py-1 text-xs">{revealedKey}</code>
            <button
              type="button"
              onClick={copyKey}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              Salin
            </button>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      <form action={createAction} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-sm font-medium">Label key baru</label>
          <input
            name="label"
            placeholder="Contoh: ERP sync"
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
        </div>
        <SubmitButton>Generate API Key</SubmitButton>
      </form>

      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada API key aktif.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium">{key.label}</p>
                <p className="text-xs text-muted-foreground">
                  {key.keyPrefix}… · dibuat {formatDate(key.createdAt)}
                  {key.lastUsedAt ? ` · terakhir dipakai ${formatDate(key.lastUsedAt)}` : ""}
                </p>
              </div>
              <form action={revokeAction}>
                <input type="hidden" name="keyId" value={key.id} />
                <SubmitButton variant="destructive" size="sm">
                  Cabut
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
