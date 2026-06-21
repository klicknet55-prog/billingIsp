"use client";

import { MapPin, Navigation, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markPaidAction } from "@/features/invoices/actions";
import { printReceipt } from "@/lib/print/thermal";
import { formatRupiah } from "@/lib/utils";

export interface Task {
  id: string;
  noInvoice: string;
  pelangganNama: string;
  pelangganWa: string;
  total: number;
  status: string;
  latitude: number | null;
  longitude: number | null;
  alamat: string | null;
}

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
}

export function KolektorTasks({ tasks, namaUsaha }: { tasks: Task[]; namaUsaha: string }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMsg("Aktifkan lokasi untuk pengurutan jarak.")
    );
  }, []);

  const sorted = useMemo(() => {
    if (!pos) return tasks;
    return [...tasks]
      .map((t) => ({
        t,
        d:
          t.latitude != null && t.longitude != null
            ? haversine(pos.lat, pos.lng, t.latitude, t.longitude)
            : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.d - b.d)
      .map((x) => ({ ...x.t, distance: x.d }));
  }, [pos, tasks]);

  async function handlePrint(t: Task) {
    const res = await printReceipt({
      namaUsaha,
      noInvoice: t.noInvoice,
      pelanggan: t.pelangganNama,
      total: formatRupiah(t.total),
      metode: "Tunai",
      tanggal: new Date().toLocaleDateString("id-ID"),
    });
    setMsg(res.message);
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada tugas penagihan di area Anda. Hubungi admin jika seharusnya ada tagihan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      {sorted.map((t) => {
        const distance = (t as Task & { distance?: number }).distance;
        const nav =
          t.latitude != null && t.longitude != null
            ? `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`
            : null;
        return (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{t.pelangganNama}</p>
                  <p className="text-sm text-muted-foreground">{t.alamat ?? "Alamat -"}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{t.noInvoice}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatRupiah(t.total)}</p>
                  {distance != null && Number.isFinite(distance) && (
                    <Badge variant="secondary" className="mt-1">
                      <MapPin className="mr-1 size-3" />
                      {distance} km
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {nav && (
                  <Button asChild variant="outline" size="sm">
                    <a href={nav} target="_blank" rel="noreferrer">
                      <Navigation /> Navigasi
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handlePrint(t)}>
                  <Printer /> Cetak
                </Button>
                <form action={markPaidAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="metode" value="Tunai" />
                  <Button size="sm" type="submit">
                    Terima Tunai & Aktifkan
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
