"use client";

import { useRef, useState } from "react";
import { payTagihanAction } from "@/features/billing/actions";
import { TagihanPayCards } from "@/features/billing/tagihan-pay-cards";

export function PayTagihanPanel({
  pelangganId,
  pelangganNama,
  bulanIniAmount,
  tunggakanTotal,
  hasBulanIni,
  hasTunggakan,
}: {
  pelangganId: string;
  pelangganNama: string;
  bulanIniAmount: number;
  tunggakanTotal: number;
  hasBulanIni: boolean;
  hasTunggakan: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const idempotencyRef = useRef(crypto.randomUUID());

  function resetKey() {
    idempotencyRef.current = crypto.randomUUID();
    setSubmitting(false);
  }

  async function submit(selection: "bulan_ini" | "tunggakan" | "keduanya") {
    if (submitting) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.set("pelangganId", pelangganId);
    fd.set("selection", selection);
    fd.set("metode", "Tunai");
    fd.set("idempotencyKey", idempotencyRef.current);
    try {
      await payTagihanAction(fd);
    } catch {
      resetKey();
    }
  }

  const canPayAnything = hasBulanIni || hasTunggakan;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Pembayaran — {pelangganNama}</p>
      <TagihanPayCards
        bulanIniAmount={bulanIniAmount}
        tunggakanTotal={tunggakanTotal}
        hasBulanIni={hasBulanIni}
        hasTunggakan={hasTunggakan}
        pending={submitting}
        onPay={submit}
      />
      {!canPayAnything && (
        <p className="text-xs text-muted-foreground">Tidak ada tagihan yang dapat dibayar saat ini.</p>
      )}
    </div>
  );
}
