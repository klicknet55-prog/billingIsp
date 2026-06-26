import { eq } from "drizzle-orm";
import { AlertTriangle, CalendarClock, Package, Wifi } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTagihanSummary } from "@/features/billing/tagihan-service";
import { listReceipts } from "@/features/invoices/service";
import { requirePelanggan } from "@/lib/auth";
import { db } from "@/lib/db";
import { paketInternet } from "@/lib/db/schema";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function PortalHome() {
  const cust = await requirePelanggan();
  const [paket, summary, receipts] = await Promise.all([
    cust.paketInternetId
      ? db.query.paketInternet.findFirst({ where: eq(paketInternet.id, cust.paketInternetId) })
      : Promise.resolve(undefined),
    getTagihanSummary(cust.tenantId, cust.id),
    listReceipts(cust.tenantId, cust.id),
  ]);

  const hasOutstanding = summary.hasBulanIni || summary.tunggakan.length > 0;
  const bulanIniAmount = summary.bulanIni?.amount ?? 0;
  const tunggakanTotal = summary.totalTunggakan;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, {cust.nama}</h1>
        <p className="text-sm text-muted-foreground">Ringkasan langganan Anda.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Paket" value={paket?.nama ?? "-"} icon={Package} hint={paket?.kecepatan} />
        <StatCard label="Jatuh Tempo" value={formatDate(cust.tglJatuhTempo)} icon={CalendarClock} />
        <StatCard
          label="Status"
          value={cust.isIsolated ? "Terisolir" : "Aktif"}
          icon={Wifi}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tagihan Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.hasBulanIni ? (
              <>
                <p className="text-2xl font-bold">{formatRupiah(bulanIniAmount)}</p>
                <Button asChild className="mt-3" size="sm">
                  <Link href="/portal/tagihan">Bayar Bulan Ini</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada tagihan bulan ini.</p>
            )}
          </CardContent>
        </Card>

        <Card className={summary.tunggakan.length > 0 ? "border-destructive/30" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4" />
              Tunggakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.tunggakan.length > 0 ? (
              <>
                <p className="text-2xl font-bold">{formatRupiah(tunggakanTotal)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.tunggakan.length} periode belum lunas
                </p>
                <Button asChild className="mt-3" size="sm" variant="outline">
                  <Link href="/portal/tagihan">Bayar Tunggakan</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada tunggakan.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {hasOutstanding && (
        <Button asChild className="w-full sm:w-auto">
          <Link href="/portal/tagihan">Lihat Semua Tagihan</Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {receipts.slice(0, 5).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted-foreground">{r.noInvoice}</span>
              <span className="flex items-center gap-3">
                {formatRupiah(r.totalTagihan)}
                <Badge variant="success">Lunas</Badge>
                <Link href={`/portal/nota/${r.id}`} className="text-xs text-primary underline">
                  PDF
                </Link>
              </span>
            </div>
          ))}
          {receipts.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada nota pembayaran.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
