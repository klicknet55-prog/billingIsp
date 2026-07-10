"use client";

import { HintButton } from "@/components/ui/hint-button";
import { formatRupiah } from "@/lib/utils";

export function TagihanPayCards({
  bulanIniAmount,
  tunggakanTotal,
  hasBulanIni,
  hasTunggakan,
  pending,
  onlinePayEnabled = true,
  onPay,
}: {
  bulanIniAmount: number;
  tunggakanTotal: number;
  hasBulanIni: boolean;
  hasTunggakan: boolean;
  pending?: boolean;
  onlinePayEnabled?: boolean;
  onPay: (selection: "bulan_ini" | "tunggakan" | "keduanya") => void;
}) {
  const canPayKeduanya = hasBulanIni && hasTunggakan;
  const busy = pending ?? false;
  const pgOffHint =
    "Pembayaran online belum tersedia. Hubungi ISP Anda untuk mengaktifkan payment gateway.";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {!onlinePayEnabled && (
        <p className="sm:col-span-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          Pembayaran online sementara nonaktif — ISP belum mengisi kredensial payment gateway di
          Integrasi.
        </p>
      )}
      <div className="rounded-md border p-4">
        <p className="font-medium">Tagihan Bulan Ini</p>
        <p className="mt-1 text-lg font-bold">
          {hasBulanIni ? formatRupiah(bulanIniAmount) : (
            <span className="text-base font-normal text-muted-foreground">Tidak ada</span>
          )}
        </p>
        <HintButton
          className="mt-3"
          size="sm"
          disabled={!hasBulanIni || busy || !onlinePayEnabled}
          hint={
            !onlinePayEnabled
              ? pgOffHint
              : !hasBulanIni
                ? "Tidak ada tagihan bulan ini untuk dibayar."
                : undefined
          }
          onClick={() => onPay("bulan_ini")}
        >
          Bayar Bulan Ini
        </HintButton>
      </div>

      <div className="rounded-md border border-destructive/30 p-4">
        <p className="font-medium text-destructive">Tunggakan</p>
        <p className="mt-1 text-lg font-bold">
          {hasTunggakan ? formatRupiah(tunggakanTotal) : (
            <span className="text-base font-normal text-muted-foreground">Tidak ada</span>
          )}
        </p>
        <HintButton
          className="mt-3"
          size="sm"
          variant="outline"
          disabled={!hasTunggakan || busy || !onlinePayEnabled}
          hint={
            !onlinePayEnabled
              ? pgOffHint
              : !hasTunggakan
                ? "Tidak ada tunggakan untuk dibayar."
                : undefined
          }
          onClick={() => onPay("tunggakan")}
        >
          Bayar Tunggakan
        </HintButton>
      </div>

      <div className="sm:col-span-2">
        <HintButton
          className="w-full"
          size="sm"
          variant="secondary"
          disabled={!canPayKeduanya || busy || !onlinePayEnabled}
          hint={
            !onlinePayEnabled
              ? pgOffHint
              : !canPayKeduanya
                ? "Perlu tagihan bulan ini dan tunggakan untuk bayar sekaligus."
                : undefined
          }
          onClick={() => onPay("keduanya")}
        >
          {canPayKeduanya
            ? `Bayar Bulan Ini + Tunggakan (${formatRupiah(bulanIniAmount + tunggakanTotal)})`
            : "Bayar Bulan Ini + Tunggakan"}
        </HintButton>
      </div>
    </div>
  );
}
