"use client";

import { MapPin, Navigation, Printer, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markPaidAction } from "@/features/invoices/actions";
import { haversineKm } from "@/lib/geo/haversine";
import {
  clearPaymentQueue,
  isOnline,
  loadKolektorTasksCache,
  loadPaymentQueue,
  queueOfflinePayment,
  saveKolektorTasksCache,
  type PendingPayment,
} from "@/lib/offline/kolektor-store";
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

export function KolektorTasks({ tasks, namaUsaha }: { tasks: Task[]; namaUsaha: string }) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [online, setOnline] = useState(true);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [displayTasks, setDisplayTasks] = useState(tasks);
  const [pendingQueue, setPendingQueue] = useState<PendingPayment[]>([]);
  const [, startSync] = useTransition();

  useEffect(() => {
    setOnline(isOnline());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMsg("Aktifkan lokasi untuk pengurutan jarak.")
    );
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      setDisplayTasks(tasks);
      void saveKolektorTasksCache(tasks, namaUsaha);
      setCachedAt(Date.now());
      return;
    }
    void loadKolektorTasksCache().then((cache) => {
      if (cache?.tasks.length) {
        setDisplayTasks(cache.tasks);
        setCachedAt(cache.savedAt);
        setMsg("Mode offline — menampilkan daftar tugas terakhir.");
      }
    });
  }, [tasks, namaUsaha]);

  useEffect(() => {
    void loadPaymentQueue().then(setPendingQueue);
  }, []);

  useEffect(() => {
    if (!online || pendingQueue.length === 0) return;
    startSync(async () => {
      for (const item of pendingQueue) {
        const fd = new FormData();
        fd.set("id", item.invoiceId);
        fd.set("metode", item.metode);
        await markPaidAction(fd);
      }
      await clearPaymentQueue();
      setPendingQueue([]);
      setMsg("Antrean pembayaran offline tersinkron.");
      window.location.reload();
    });
  }, [online, pendingQueue, startSync]);

  const sorted = useMemo(() => {
    if (!pos) return displayTasks;
    return [...displayTasks]
      .map((t) => ({
        t,
        d:
          t.latitude != null && t.longitude != null
            ? haversineKm(pos.lat, pos.lng, t.latitude, t.longitude)
            : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.d - b.d)
      .map((x) => ({ ...x.t, distance: x.d }));
  }, [pos, displayTasks]);

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

  async function handleCashPayment(t: Task) {
    if (!online) {
      await queueOfflinePayment(t.id, "Tunai");
      const q = await loadPaymentQueue();
      setPendingQueue(q);
      setMsg("Offline — pembayaran akan disinkron saat online.");
      return;
    }
    const fd = new FormData();
    fd.set("id", t.id);
    fd.set("metode", "Tunai");
    await markPaidAction(fd);
  }

  if (displayTasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada tugas penagihan di area Anda. Hubungi admin jika seharusnya ada tagihan.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!online && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <WifiOff className="size-4 shrink-0" />
          Offline — daftar tugas dari cache
          {cachedAt ? ` (${new Date(cachedAt).toLocaleString("id-ID")})` : ""}
        </div>
      )}
      {pendingQueue.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {pendingQueue.length} pembayaran menunggu sinkron saat online.
        </p>
      )}
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
                <Button size="sm" type="button" onClick={() => handleCashPayment(t)}>
                  Terima Tunai & Aktifkan
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
