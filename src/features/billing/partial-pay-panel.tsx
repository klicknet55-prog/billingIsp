"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { payPartialTagihanAction } from "@/features/billing/actions";
import { formatRupiah } from "@/lib/utils";

export type PartialPayOption = {
  id: string;
  periode: string;
  balance: number;
};

export function PartialPayPanel({
  pelangganId,
  options,
}: {
  pelangganId: string;
  options: PartialPayOption[];
}) {
  const payable = options.filter((o) => o.balance > 0);
  const [tagihanId, setTagihanId] = useState(payable[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef(crypto.randomUUID());

  const selected = payable.find((o) => o.id === tagihanId);
  const maxAmount = selected?.balance ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !tagihanId) return;
    const parsed = Number(amount.replace(/\D/g, ""));
    if (!parsed || parsed <= 0 || parsed > maxAmount) return;

    setSubmitting(true);
    const fd = new FormData();
    fd.set("pelangganId", pelangganId);
    fd.set("tagihanId", tagihanId);
    fd.set("amount", String(parsed));
    fd.set("metode", "Tunai");
    fd.set("idempotencyKey", idempotencyRef.current);
    try {
      await payPartialTagihanAction(fd);
    } catch {
      idempotencyRef.current = crypto.randomUUID();
      setSubmitting(false);
    }
  }

  if (payable.length === 0) return null;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-dashed p-4">
      <p className="text-sm font-medium">Bayar Sebagian</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="partial-tagihan">Tagihan</Label>
          <Select
            id="partial-tagihan"
            value={tagihanId}
            onChange={(e) => {
              setTagihanId(e.target.value);
              setAmount("");
            }}
          >
            {payable.map((o) => (
              <option key={o.id} value={o.id}>
                {o.periode} — sisa {formatRupiah(o.balance)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="partial-amount">Nominal (maks. {formatRupiah(maxAmount)})</Label>
          <Input
            id="partial-amount"
            type="number"
            min={1}
            max={maxAmount}
            placeholder="50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={submitting || !amount}>
        {submitting ? "Memproses..." : "Catat Pembayaran Sebagian"}
      </Button>
    </form>
  );
}
