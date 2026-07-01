"use client";

import { MapPin, Printer, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { PayTagihanSheet } from "@/features/billing/pay-tagihan-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { haversineKm } from "@/lib/geo/haversine";
import { printReceipt, type ReceiptData } from "@/lib/print/thermal";
import { formatRupiah } from "@/lib/utils";

export type KolektorTask = {
  pelangganId: string;
  nama: string;
  wa: string;
  lat: number | null;
  lng: number | null;
  alamat: string | null;
  bulanIniAmount: number;
  tunggakanTotal: number;
  hasBulanIni: boolean;
  hasTunggakan: boolean;
};

type SortMode = "terdekat" | "nama";

function mapsUrl(lat: number | null, lng: number | null, alamat: string | null): string | null {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (alamat) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}`;
  }
  return null;
}

export function KolektorTasksClient({
  tasks,
  namaUsaha,
  kolektorNama,
}: {
  tasks: KolektorTask[];
  namaUsaha: string;
  kolektorNama: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState<SortMode>("terdekat");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [payTarget, setPayTarget] = useState<KolektorTask | null>(null);
  const [printMsg, setPrintMsg] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const noNota = searchParams.get("noNota");
    const total = searchParams.get("total");
    const pelanggan = searchParams.get("pelanggan");
    const error = searchParams.get("error");
    if (error) {
      setPrintMsg(decodeURIComponent(error));
      router.replace("/kolektor", { scroll: false });
    }
    if (paid === "1" && noNota && total && pelanggan) {
      setLastReceipt({
        namaUsaha,
        noInvoice: noNota,
        pelanggan: decodeURIComponent(pelanggan),
        total: decodeURIComponent(total),
        metode: "Tunai",
        tanggal: new Date().toLocaleString("id-ID"),
      });
      setPrintMsg("Pembayaran berhasil.");
      router.replace("/kolektor", { scroll: false });
    }
  }, [searchParams, namaUsaha, router]);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOnline = () => {
      setOffline(false);
      setLastSync(new Date());
    };
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLastSync(new Date());
      },
      () => setGpsDenied(true),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  const sorted = useMemo(() => {
    const list = tasks.map((t) => {
      let jarakKm: number | null = null;
      if (coords && t.lat != null && t.lng != null) {
        jarakKm = haversineKm(coords.lat, coords.lng, t.lat, t.lng);
      }
      return { ...t, jarakKm };
    });
    if (sort === "nama") {
      return [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    }
    if (coords) {
      return [...list].sort((a, b) => {
        if (a.jarakKm == null && b.jarakKm == null) return a.nama.localeCompare(b.nama, "id");
        if (a.jarakKm == null) return 1;
        if (b.jarakKm == null) return -1;
        return a.jarakKm - b.jarakKm;
      });
    }
    return list;
  }, [tasks, sort, coords]);

  const handlePrint = useCallback(async (task: KolektorTask) => {
    setPrintMsg(null);
    const data: ReceiptData =
      lastReceipt && lastReceipt.pelanggan === task.nama
        ? lastReceipt
        : {
            namaUsaha,
            noInvoice: "-",
            pelanggan: task.nama,
            total: formatRupiah(
              task.hasTunggakan
                ? task.tunggakanTotal
                : task.hasBulanIni
                  ? task.bulanIniAmount
                  : 0
            ),
            metode: "Tunai",
            tanggal: new Date().toLocaleString("id-ID"),
          };
    const result = await printReceipt(data);
    setPrintMsg(result.message);
  }, [lastReceipt, namaUsaha]);

  return (
    <>
      {offline && <OfflineBanner lastSync={lastSync} />}
      {gpsDenied && sort === "terdekat" && (
        <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
          Izin lokasi ditolak. Sort menggunakan urutan nama.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setGpsDenied(false);
                  },
                  () => setGpsDenied(true)
                );
              }
            }}
          >
            Coba lagi
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{sorted.length} pelanggan menunggak</span>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Sort:</span>
          <select
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            <option value="terdekat">Terdekat</option>
            <option value="nama">Nama</option>
          </select>
        </label>
      </div>

      {printMsg && (
        <p className="mb-3 rounded-md border p-2 text-sm text-muted-foreground">{printMsg}</p>
      )}

      <div className="space-y-3">
        {sorted.map((p) => {
          const nav = mapsUrl(p.lat, p.lng, p.alamat);
          const tunggakanLabel =
            p.hasTunggakan && p.tunggakanTotal > 0
              ? `Tunggakan: ${formatRupiah(p.tunggakanTotal)}`
              : p.hasBulanIni
                ? `Bulan ini: ${formatRupiah(p.bulanIniAmount)}`
                : null;
          return (
            <Card key={p.pelangganId}>
              <CardContent className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="font-medium">{p.nama}</p>
                  {p.jarakKm != null && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.jarakKm < 1 ? `${Math.round(p.jarakKm * 1000)} m` : `${p.jarakKm} km`}
                    </span>
                  )}
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{p.alamat ?? p.wa}</p>
                {tunggakanLabel && (
                  <p className="mb-3 text-sm font-medium text-destructive">{tunggakanLabel}</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-[44px] gap-1 px-2 text-xs"
                    disabled={!nav}
                    asChild={!!nav}
                  >
                    {nav ? (
                      <a href={nav} target="_blank" rel="noreferrer">
                        <MapPin className="size-4" />
                        Maps
                      </a>
                    ) : (
                      <>
                        <MapPin className="size-4" />
                        Maps
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className="h-11 min-h-[44px] gap-1 px-2 text-xs"
                    disabled={offline || (!p.hasBulanIni && !p.hasTunggakan)}
                    onClick={() => setPayTarget(p)}
                  >
                    <Wallet className="size-4" />
                    Bayar
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 min-h-[44px] gap-1 px-2 text-xs"
                    onClick={() => handlePrint(p)}
                  >
                    <Printer className="size-4" />
                    Cetak
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sorted.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Tidak ada tagihan outstanding di area Anda.
            </CardContent>
          </Card>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {namaUsaha} — Kolektor {kolektorNama}
      </p>

      {payTarget && (
        <PayTagihanSheet
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
          pelangganId={payTarget.pelangganId}
          pelangganNama={payTarget.nama}
          bulanIniAmount={payTarget.bulanIniAmount}
          tunggakanTotal={payTarget.tunggakanTotal}
          hasBulanIni={payTarget.hasBulanIni}
          hasTunggakan={payTarget.hasTunggakan}
          redirectTo="/kolektor"
        />
      )}
    </>
  );
}
