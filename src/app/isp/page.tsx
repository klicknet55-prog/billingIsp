import { FileText, Users, Wifi, WifiOff } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPelanggan } from "@/features/customers/service";
import { listInvoices } from "@/features/invoices/service";
import { requireUser } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";

export default async function IspDashboard() {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [pelanggan, invoices] = await Promise.all([
    listPelanggan(tenantId),
    listInvoices(tenantId),
  ]);

  const isolir = pelanggan.filter((p) => p.isIsolated).length;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const pendapatan = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.totalTagihan, 0);

  return (
    <>
      <PageHeader title="Dashboard" description="Ringkasan operasional ISP Anda." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Pelanggan" value={pelanggan.length} icon={Users} />
        <StatCard label="Aktif" value={pelanggan.length - isolir} icon={Wifi} />
        <StatCard label="Terisolir" value={isolir} icon={WifiOff} />
        <StatCard label="Pendapatan Lunas" value={formatRupiah(pendapatan)} icon={FileText} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tagihan Belum Lunas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unpaid.slice(0, 6).map((i) => (
            <div key={i.id} className="flex items-center justify-between text-sm">
              <span className="font-medium">{i.pelangganNama}</span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatRupiah(i.totalTagihan)}</span>
                <Badge variant={i.status === "overdue" ? "destructive" : "warning"}>
                  {i.status === "overdue" ? "Jatuh tempo" : "Belum bayar"}
                </Badge>
              </span>
            </div>
          ))}
          {unpaid.length === 0 && (
            <p className="text-sm text-muted-foreground">Semua tagihan lunas.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
