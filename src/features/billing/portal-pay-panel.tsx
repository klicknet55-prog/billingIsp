"use client";

import { useRef, useTransition } from "react";
import { payTagihanPortalAction } from "@/features/billing/actions";
import { TagihanPayCards } from "@/features/billing/tagihan-pay-cards";

export function PortalPayPanel({
  bulanIniAmount,
  tunggakanTotal,
  hasBulanIni,
  hasTunggakan,
}: {
  bulanIniAmount: number;
  tunggakanTotal: number;
  hasBulanIni: boolean;
  hasTunggakan: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const idempotencyRef = useRef(crypto.randomUUID());

  function pay(selection: "bulan_ini" | "tunggakan" | "keduanya") {
    if (pending) return;
    const fd = new FormData();
    fd.set("selection", selection);
    fd.set("metode", "QRIS");
    fd.set("idempotencyKey", idempotencyRef.current);
    startTransition(async () => {
      try {
        await payTagihanPortalAction(fd);
      } catch {
        idempotencyRef.current = crypto.randomUUID();
      }
    });
  }

  return (
    <TagihanPayCards
      bulanIniAmount={bulanIniAmount}
      tunggakanTotal={tunggakanTotal}
      hasBulanIni={hasBulanIni}
      hasTunggakan={hasTunggakan}
      pending={pending}
      onPay={pay}
    />
  );
}
