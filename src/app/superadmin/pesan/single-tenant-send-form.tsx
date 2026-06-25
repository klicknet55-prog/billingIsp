"use client";

import { useActionState, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import {
  previewTenantMessageAction,
  sendSingleTenantAction,
} from "@/features/messages/actions";
import { TenantPlaceholderList } from "./tenant-placeholder-list";

const initial: ActionState = {};

type TenantRow = {
  id: string;
  namaUsaha: string;
  domain: string;
  status: string;
  ownerNama: string | null;
  ownerPhone: string | null;
};

export function SingleTenantSendForm({ tenants }: { tenants: TenantRow[] }) {
  const [state, action] = useActionState(sendSingleTenantAction, initial);
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (state.ok) toast({ title: "Pesan terkirim ke owner tenant", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  useEffect(() => {
    if (!tenantId) {
      setPreview("");
      return;
    }
    previewTenantMessageAction({ tenantId, customBody: customBody || undefined }).then((res) => {
      if ("message" in res) setPreview(res.message);
      else setPreview(res.error);
    });
  }, [tenantId, customBody]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="customBody" value={customBody} />

      <div className="space-y-2">
        <Label>Tenant</Label>
        <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          <option value="">— Pilih tenant —</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.namaUsaha} ({t.domain}) · {t.ownerPhone ?? "tanpa WA"}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Pesan (kosong = template manual_tenant)</Label>
          <Textarea
            rows={6}
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
          />
        </div>
        <TenantPlaceholderList
          onInsert={(token) => setCustomBody((prev) => `${prev}${prev ? " " : ""}${token}`)}
        />
      </div>

      {preview && (
        <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">{preview}</pre>
      )}

      <SubmitButton disabled={!tenantId}>Kirim ke Owner</SubmitButton>
    </form>
  );
}
