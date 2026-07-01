"use client";

import { useRef, useState } from "react";
import { BottomSheet } from "@/components/layout/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { payTagihanAction } from "@/features/billing/actions";
import { formatRupiah } from "@/lib/utils";

type Selection = "bulan_ini" | "tunggakan" | "keduanya";

export function PayTagihanSheet({
  open,
  onClose,
  pelangganId,
  pelangganNama,
  bulanIniAmount,
  tunggakanTotal,
  hasBulanIni,
  hasTunggakan,
  redirectTo = "/kolektor",
}: {
  open: boolean;
  onClose: () => void;
  pelangganId: string;
  pelangganNama: string;
  bulanIniAmount: number;
  tunggakanTotal: number;
  hasBulanIni: boolean;
  hasTunggakan: boolean;
  redirectTo?: string;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef(crypto.randomUUID());

  const options: { id: Selection; label: string; amount: number; enabled: boolean }[] = [
    { id: "bulan_ini", label: "Bulan ini", amount: bulanIniAmount, enabled: hasBulanIni },
    {
      id: "tunggakan",
      label: "Tunggakan",
      amount: tunggakanTotal,
      enabled: hasTunggakan,
    },
    {
      id: "keduanya",
      label: "Keduanya",
      amount: bulanIniAmount + tunggakanTotal,
      enabled: hasBulanIni && hasTunggakan,
    },
  ];

  const selected = options.find((o) => o.id === selection);
  const canSubmit = selected?.enabled && !submitting;

  async function handleSubmit() {
    if (!selected?.enabled || submitting) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.set("pelangganId", pelangganId);
    fd.set("selection", selected.id);
    fd.set("metode", "Tunai");
    fd.set("idempotencyKey", idempotencyRef.current);
    fd.set("redirectTo", redirectTo);
    fd.set("pelangganNama", pelangganNama);
    try {
      await payTagihanAction(fd);
    } catch {
      idempotencyRef.current = crypto.randomUUID();
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setSelection(null);
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title="Catat pembayaran tunai"
      description={pelangganNama}
    >
      <div className="space-y-3">
        <Label>Pilih tagihan</Label>
        {options.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
              !opt.enabled ? "cursor-not-allowed opacity-50" : ""
            } ${selection === opt.id ? "border-primary bg-primary/5" : ""}`}
          >
            <input
              type="radio"
              name="pay-selection"
              className="size-4"
              disabled={!opt.enabled}
              checked={selection === opt.id}
              onChange={() => setSelection(opt.id)}
            />
            <span className="flex-1 text-sm">
              <span className="font-medium">{opt.label}</span>
              <span className="block text-muted-foreground">{formatRupiah(opt.amount)}</span>
            </span>
          </label>
        ))}
        {!hasBulanIni && !hasTunggakan && (
          <p className="text-sm text-muted-foreground">Tidak ada tagihan yang dapat dibayar.</p>
        )}
        <Button
          type="button"
          className="mt-2 h-12 w-full"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting
            ? "Memproses..."
            : selected
              ? `Konfirmasi ${formatRupiah(selected.amount)}`
              : "Pilih tagihan"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={handleClose}>
          Batal
        </Button>
      </div>
    </BottomSheet>
  );
}
