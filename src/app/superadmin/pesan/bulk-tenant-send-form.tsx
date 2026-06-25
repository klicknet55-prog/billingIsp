"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { previewTenantMessageAction, startBulkTenantAction } from "@/features/messages/actions";
import { BatchProgress } from "@/app/isp/pesan/batch-progress";
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

export function BulkTenantSendForm({ tenants }: { tenants: TenantRow[] }) {
  const [state, action] = useActionState(startBulkTenantAction, initial);
  const { toast } = useToast();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [preview, setPreview] = useState("");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (state.ok && (state as ActionState & { batchId?: string }).batchId) {
      setBatchId((state as ActionState & { batchId?: string }).batchId!);
      toast({ title: "Batch kirim massal dimulai", variant: "success" });
      setConfirmOpen(false);
    }
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state, toast]);

  const filtered = useMemo(() => {
    return tenants.filter((t) => !statusFilter || t.status === statusFilter);
  }, [tenants, statusFilter]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  useEffect(() => {
    const sampleId = selectedIds[0];
    if (!sampleId) {
      setPreview("");
      return;
    }
    previewTenantMessageAction({ tenantId: sampleId, customBody: customBody || undefined }).then(
      (res) => {
        if ("message" in res) setPreview(res.message);
        else setPreview(res.error);
      }
    );
  }, [selectedIds, customBody]);

  const payload = JSON.stringify(selectedIds);

  return (
    <div className="space-y-4">
      {batchId && <BatchProgress batchId={batchId} />}

      <form action={action} className="space-y-4">
        <input type="hidden" name="recipientIds" value={payload} readOnly />
        <input type="hidden" name="customBody" value={customBody} />

        <div className="space-y-2">
          <Label>Filter status</Label>
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua</option>
            <option value="active">Aktif</option>
            <option value="suspended">Suspend</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelected(Object.fromEntries(filtered.map((t) => [t.id, true])))}
          >
            Pilih semua
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setSelected({})}>
            Clear
          </Button>
        </div>

        <div className="max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80">
              <tr>
                <th className="p-2 w-8" />
                <th className="p-2 text-left">Usaha</th>
                <th className="p-2 text-left">Owner / WA</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[t.id])}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [t.id]: e.target.checked }))
                      }
                    />
                  </td>
                  <td className="p-2">{t.namaUsaha}</td>
                  <td className="p-2">
                    {t.ownerNama ?? "—"} · {t.ownerPhone ?? "—"}
                  </td>
                  <td className="p-2">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Badge variant="secondary">{selectedIds.length} tenant dipilih</Badge>

        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            rows={5}
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
            placeholder="Pesan ke owner tenant"
          />
          <TenantPlaceholderList
            onInsert={(token) => setCustomBody((prev) => `${prev}${prev ? " " : ""}${token}`)}
          />
        </div>

        {preview && selectedIds.length > 0 && (
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
            {preview}
          </pre>
        )}

        {!confirmOpen ? (
          <Button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            Kirim Massal ({selectedIds.length})
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <p className="text-sm">Kirim ke {selectedIds.length} owner tenant?</p>
            <SubmitButton>Konfirmasi</SubmitButton>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
