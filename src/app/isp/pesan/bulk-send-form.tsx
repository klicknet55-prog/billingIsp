"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { previewPelangganMessageAction, startBulkPelangganAction } from "@/features/messages/actions";
import type { PelangganRow } from "@/features/customers/service";
import type { Router } from "@/lib/db/schema";
import { BatchProgress } from "./batch-progress";
import { PlaceholderList } from "./placeholder-list";

const initial: ActionState = {};

export function BulkSendForm({
  pelanggan,
  routers,
}: {
  pelanggan: PelangganRow[];
  routers: Router[];
}) {
  const [state, action] = useActionState(startBulkPelangganAction, initial);
  const { toast } = useToast();
  const [mode, setMode] = useState<"pick" | "router">("pick");
  const [routerId, setRouterId] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [messageType, setMessageType] = useState<"invoice" | "custom">("invoice");
  const [customBody, setCustomBody] = useState("");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
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

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  );

  useEffect(() => {
    if (mode === "router" && routerId) {
      const ids = pelanggan.filter((p) => p.routerId === routerId).map((p) => p.id);
      setSelected(Object.fromEntries(ids.map((id) => [id, true])));
    }
  }, [mode, routerId, pelanggan]);

  useEffect(() => {
    const sampleId = selectedIds[0];
    if (!sampleId) {
      setPreview("");
      return;
    }
    previewPelangganMessageAction({
      pelangganId: sampleId,
      messageType,
      customBody: messageType === "custom" ? customBody : undefined,
    }).then((res) => {
      if ("message" in res) setPreview(res.message);
      else setPreview(res.error);
    });
  }, [selectedIds, messageType, customBody]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pelanggan.filter((p) => {
      if (mode === "router" && routerId && p.routerId !== routerId) return false;
      if (!q) return true;
      return (
        p.nama.toLowerCase().includes(q) ||
        p.noWa.includes(q) ||
        (p.alamat ?? "").toLowerCase().includes(q)
      );
    });
  }, [pelanggan, mode, routerId, search]);

  function toggleAll(checked: boolean) {
    setSelected(Object.fromEntries(filtered.map((p) => [p.id, checked])));
  }

  const payload = JSON.stringify(selectedIds);

  return (
    <div className="space-y-4">
      {batchId && (
        <BatchProgress
          batchId={batchId}
          onDone={() => {
            toast({
              title: "Batch selesai — lihat tab Riwayat untuk detail",
              variant: "success",
            });
          }}
        />
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="recipientIds" value={payload} readOnly />
        <input type="hidden" name="messageType" value={messageType} />
        <input type="hidden" name="customBody" value={customBody} />
        {onlyUnpaid && <input type="hidden" name="onlyUnpaid" value="on" />}

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "pick"}
              onChange={() => setMode("pick")}
            />
            Pilih pelanggan
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "router"}
              onChange={() => setMode("router")}
            />
            By router
          </label>
        </div>

        {mode === "router" && (
          <div className="space-y-2">
            <Label>Router</Label>
            <Select value={routerId} onChange={(e) => setRouterId(e.target.value)}>
              <option value="">— Pilih router —</option>
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label>Cari</Label>
            <input
              className="h-9 w-full rounded-md border px-3 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama / WA / alamat"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(true)}>
            Pilih semua
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(false)}>
            Clear
          </Button>
        </div>

        <div className="max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80">
              <tr>
                <th className="p-2 text-left w-8" />
                <th className="p-2 text-left">Nama</th>
                <th className="p-2 text-left">WA</th>
                <th className="p-2 text-left">Router</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[p.id])}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [p.id]: e.target.checked }))
                      }
                    />
                  </td>
                  <td className="p-2">{p.nama}</td>
                  <td className="p-2">{p.noWa}</td>
                  <td className="p-2 text-muted-foreground">{p.routerNama ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Badge variant="secondary">{selectedIds.length} pelanggan dipilih</Badge>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyUnpaid}
            onChange={(e) => setOnlyUnpaid(e.target.checked)}
          />
          Hanya yang punya tagihan belum lunas
        </label>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={messageType === "invoice"}
              onChange={() => setMessageType("invoice")}
            />
            Tagihan / link bayar
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={messageType === "custom"}
              onChange={() => setMessageType("custom")}
            />
            Custom
          </label>
        </div>

        {messageType === "custom" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Textarea
              rows={5}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="Pesan custom dengan placeholder"
            />
            <PlaceholderList
              onInsert={(token) => setCustomBody((prev) => `${prev}${prev ? " " : ""}${token}`)}
            />
          </div>
        )}

        {preview && selectedIds.length > 0 && (
          <div>
            <Label>Preview (contoh pelanggan pertama)</Label>
            <pre className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm">
              {preview}
            </pre>
          </div>
        )}

        {!confirmOpen ? (
          <Button
            type="button"
            disabled={selectedIds.length === 0 || Boolean(batchId && state.ok)}
            onClick={() => setConfirmOpen(true)}
          >
            Kirim Massal ({selectedIds.length})
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm">
              Kirim ke {selectedIds.length} pelanggan? Proses berjalan di background dengan delay
              acak + pause 30 detik tiap 10 pesan.
            </p>
            <SubmitButton>Konfirmasi Kirim</SubmitButton>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
