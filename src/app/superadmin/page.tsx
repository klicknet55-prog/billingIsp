import { Building2, CreditCard, Package, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listPackages, listSaasTransactions, listTenants } from "@/features/tenants/service";
import { formatRupiah } from "@/lib/utils";

export default async function SuperadminDashboard() {
  const [tenants, packages, tx] = await Promise.all([
    listTenants(),
    listPackages(),
    listSaasTransactions(),
  ]);
  const aktif = tenants.filter((t) => t.status === "active").length;
  const pendapatan = tx
    .filter((t) => t.status === "success")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <PageHeader title="Dashboard Platform" description="Ringkasan seluruh tenant NetManage." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tenant" value={tenants.length} icon={Building2} />
        <StatCard label="Tenant Aktif" value={aktif} icon={Users} />
        <StatCard label="Paket SaaS" value={packages.length} icon={Package} />
        <StatCard label="Pendapatan SaaS" value={formatRupiah(pendapatan)} icon={CreditCard} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tenant Terbaru</CardTitle>
          <CardDescription>5 ISP yang baru terdaftar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tenants.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <span className="font-medium">{t.namaUsaha}</span>
              <span className="text-muted-foreground">{t.domain}</span>
            </div>
          ))}
          {tenants.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada tenant.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
