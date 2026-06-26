"use client";

import { useTransition } from "react";
import { catatNunggakAction } from "@/features/billing/actions";
import { Button } from "@/components/ui/button";

export function CatatNunggakButton({
  pelangganId,
  disabled,
}: {
  pelangganId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending || disabled) return;
    const fd = new FormData();
    fd.set("pelangganId", pelangganId);
    startTransition(() => catatNunggakAction(fd));
  }

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="font-medium text-amber-900 dark:text-amber-100">Catat Nunggak</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Mencatat tagihan lewat jatuh tempo sebagai tunggakan (dibayar via Bayar Tunggakan),
        memperbarui jatuh tempo ke periode berikutnya, dan mengaktifkan kembali layanan pelanggan.
      </p>
      <Button
        type="button"
        className="mt-3"
        variant="outline"
        disabled={disabled || pending}
        onClick={submit}
      >
        {pending ? "Memproses…" : "Catat Nunggak & Aktifkan"}
      </Button>
    </div>
  );
}
