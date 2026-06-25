import Link from "next/link";
import { Activity, Building2, CreditCard, Package, Rocket, Router, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDeployInfo } from "@/features/platform-deploy/service";
import { getPlatformHealth } from "@/features/platform-health/service";
import { listPackages, listSaasTransactions, listTenants } from "@/features/tenants/service";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function SuperadminDashboard() {
  const [tenants, packages, tx, health, deploy] = await Promise.all([
    listTenants(),
    listPackages(),
    listSaasTransactions(),
    getPlatformHealth(),
    getDeployInfo(),
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
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="size-5" />
              Update Aplikasi
            </CardTitle>
            <CardDescription>
              Deploy manual dari GitHub — hanya superadmin. Versi saat ini{" "}
              <code className="rounded bg-muted px-1">{deploy.git.commit ?? "—"}</code>
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/superadmin/deploy">Kelola update</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <Badge
            variant={
              deploy.status === "running"
                ? "warning"
                : deploy.status === "success"
                  ? "success"
                  : deploy.status === "failed"
                    ? "destructive"
                    : "secondary"
            }
          >
            {deploy.status === "idle"
              ? "Siap"
              : deploy.status === "running"
                ? "Deploy berjalan"
                : deploy.status === "success"
                  ? "Deploy sukses"
                  : "Deploy gagal"}
          </Badge>
          {!deploy.enabled && (
            <span className="text-muted-foreground">
              Set <code className="rounded bg-muted px-1">DEPLOY_ENABLED=true</code> di production
            </span>
          )}
          {deploy.finishedAt && (
            <span className="text-muted-foreground">
              Terakhir: {formatDate(deploy.finishedAt)}
              {deploy.startedBy ? ` · ${deploy.startedBy}` : ""}
            </span>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            System Health
          </CardTitle>
          <CardDescription>Status cron, tenant, dan router platform.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground">Cron terakhir</p>
            <p className="font-medium">
              {health.cronLastRunAt ? formatDate(health.cronLastRunAt) : "Belum pernah"}
            </p>
            {health.cronLastResult && (
              <p className="mt-1 text-xs text-muted-foreground">
                billing.generated=
                {String(
                  (health.cronLastResult.billing as { generated?: number } | undefined)
                    ?.generated ?? "-"
                )}
                , saas.suspended=
                {String(
                  (health.cronLastResult.saas as { suspended?: number } | undefined)?.suspended ??
                    "-"
                )}
              </p>
            )}
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground">Tenant</p>
            <p className="font-medium">
              {health.tenantActive} aktif / {health.tenantSuspended} suspend / {health.tenantTotal}{" "}
              total
            </p>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground flex items-center gap-1">
              <Router className="size-4" /> Router offline
            </p>
            <p className="font-medium">
              {health.routerOffline} dari {health.routerTotal} router
            </p>
          </div>
        </CardContent>
      </Card>

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
