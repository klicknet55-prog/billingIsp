"use client";

import { useActionState, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import {
  previewPelangganMessageAction,
  sendSinglePelangganAction,
} from "@/features/messages/actions";
import type { PelangganRow } from "@/features/customers/service";
import { PlaceholderList } from "./placeholder-list";

const initial: ActionState = {};

export function SingleSendForm({ pelanggan }: { pelanggan: PelangganRow[] }) {
  const [state, action] = useActionState(sendSinglePelangganAction, initial);
  const { toast } = useToast();
  const [pelangganId, setPelangganId] = useState("");
  const [messageType, setMessageType] = useState<"invoice" | "custom">("invoice");
  const [customBody, setCustomBody] = useState("");
  const [preview, setPreview] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (state.ok) toast({ title: "Pesan terkirim", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  useEffect(() => {
    if (!pelangganId) {
      setPreview("");
      return;
    }
    previewPelangganMessageAction({
      pelangganId,
      messageType,
      customBody: messageType === "custom" ? customBody : undefined,
    }).then((res) => {
      if ("message" in res) setPreview(res.message);
      else setPreview(res.error);
    });
  }, [pelangganId, messageType, customBody]);

  const filtered = pelanggan.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nama.toLowerCase().includes(q) ||
      p.noWa.includes(q) ||
      (p.alamat ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="pelangganId" value={pelangganId} />
      <input type="hidden" name="messageType" value={messageType} />
      <input type="hidden" name="customBody" value={customBody} />

      <div className="space-y-2">
        <Label htmlFor="search">Cari pelanggan</Label>
        <input
          id="search"
          name="search"
          type="search"
          autoComplete="off"
          className="h-9 w-full rounded-md border px-3 text-sm"
          placeholder="Nama, WA, alamat…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pelangganId">Pelanggan</Label>
        <Select
          id="pelangganId"
          name="pelangganIdUi"
          value={pelangganId}
          onChange={(e) => setPelangganId(e.target.value)}
        >
          <option value="">— Pilih pelanggan —</option>
          {filtered.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama} · {p.noWa}
              {p.routerNama ? ` · ${p.routerNama}` : ""}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-2 border-0 p-0">
        <legend className="text-sm font-medium leading-none">Tipe pesan</legend>
        <div className="flex flex-wrap gap-4 pt-2 text-sm">
          <label className="flex items-center gap-2" htmlFor="messageTypeInvoice">
            <input
              id="messageTypeInvoice"
              type="radio"
              name="messageTypeUi"
              checked={messageType === "invoice"}
              onChange={() => setMessageType("invoice")}
            />
            Tagihan / link bayar
          </label>
          <label className="flex items-center gap-2" htmlFor="messageTypeCustom">
            <input
              id="messageTypeCustom"
              type="radio"
              name="messageTypeUi"
              checked={messageType === "custom"}
              onChange={() => setMessageType("custom")}
            />
            Custom
          </label>
        </div>
      </fieldset>

      {messageType === "custom" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customBody">Isi pesan</Label>
            <Textarea
              id="customBody"
              name="customBodyUi"
              rows={6}
              value={customBody}
              onChange={(e) => setCustomBody(e.target.value)}
              placeholder="Gunakan [[nama_pelanggan]], [[tagihan]], dll."
            />
          </div>
          <PlaceholderList
            onInsert={(token) => setCustomBody((prev) => `${prev}${prev ? " " : ""}${token}`)}
          />
        </div>
      )}

      {preview && (
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">Preview</p>
          <pre
            id="single-send-preview"
            className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm"
          >
            {preview}
          </pre>
        </div>
      )}

      <SubmitButton disabled={!pelangganId}>Kirim Pesan</SubmitButton>
    </form>
  );
}
