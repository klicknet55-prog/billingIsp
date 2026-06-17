import { eq } from "drizzle-orm";
import { CalendarClock, Package, Wifi } from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listInvoicesByPelanggan } from "@/features/invoices/service";
import { requirePelanggan } from "@/lib/auth";
import { db } from "@/lib/db";
import { paketInternet } from "@/lib/db/schema";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function PortalHome() {
  const cust = await requirePelanggan();
  const [paket, invoices] = await Promise.all([
    cust.paketInternetId
      ? db.query.paketInternet.findFirst({ where: eq(paketInternet.id, cust.paketInternetId) })
      : Promise.resolve(undefined),
    listInvoicesByPelanggan(cust.tenantId, cust.id),
  ]);

  const unpaid = invoices.filter((i) => i.status !== "paid");
  const tagihan = unpaid.reduce((s, i) => s + i.totalTagihan, 0);

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

      {tagihan > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tagihan Belum Lunas</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{formatRupiah(tagihan)}</p>
              <p className="text-sm text-muted-foreground">{unpaid.length} invoice</p>
            </div>
            <Button asChild>
              <Link href="/portal/tagihan">Bayar Sekarang</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoices.slice(0, 5).map((i) => (
            <div key={i.id} className="flex items-center justify-between text-sm">
              <span className="font-mono text-xs text-muted-foreground">{i.noInvoice}</span>
              <span className="flex items-center gap-3">
                {formatRupiah(i.totalTagihan)}
                <Badge variant={i.status === "paid" ? "success" : "warning"}>
                  {i.status === "paid" ? "Lunas" : "Belum"}
                </Badge>
              </span>
            </div>
          ))}
          {invoices.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada invoice.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
