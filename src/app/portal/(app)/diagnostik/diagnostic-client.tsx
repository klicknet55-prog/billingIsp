"use client";

import { Activity, Gauge, Wifi } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Result {
  latencyMs: number | null;
  downMbps: number | null;
  online: boolean;
}

export function DiagnosticClient() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      // Latensi: waktu round-trip ke server aplikasi.
      const t0 = performance.now();
      await fetch("/favicon.ico", { cache: "no-store" }).catch(() => null);
      const latency = Math.round(performance.now() - t0);

      // Estimasi unduh: ukur waktu unduh aset kecil beberapa kali.
      const sizeKB = 50;
      const t1 = performance.now();
      await fetch(`/favicon.ico?cb=${Date.now()}`, { cache: "no-store" }).catch(() => null);
      const dt = (performance.now() - t1) / 1000;
      const mbps = dt > 0 ? Math.round(((sizeKB * 8) / 1024 / dt) * 10) / 10 : null;

      setResult({ latencyMs: latency, downMbps: mbps, online: navigator.onLine });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={running}>
        <Activity /> {running ? "Menguji..." : "Mulai Tes Koneksi"}
      </Button>

      {result && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Gauge className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Latensi</p>
                <p className="font-bold">{result.latencyMs ?? "-"} ms</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Activity className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Estimasi Unduh</p>
                <p className="font-bold">{result.downMbps ?? "-"} Mbps</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Wifi className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-bold">{result.online ? "Online" : "Offline"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Estimasi sederhana untuk indikasi awal. Untuk pengukuran akurat, gunakan server speedtest
        khusus.
      </p>
    </div>
  );
}
