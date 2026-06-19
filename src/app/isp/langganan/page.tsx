import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getTenantSubscriptionStatus,
  listActiveSaasPackages,
} from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";
import { UpgradePackageDialog } from "./upgrade-package-dialog";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const ok = qs.ok === "1";

  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const [current, packages] = await Promise.all([
    getTenantSubscriptionStatus(tenantId),
    listActiveSaasPackages(),
  ]);

  return (
    <>
      <PageHeader
        title="Langganan SaaS"
        description="Lihat status paket aktif dan lakukan upgrade paket berlangganan."
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {ok && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-sm text-primary">
            Paket berlangganan berhasil diperbarui.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Paket Saat Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {current ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nama Paket</span>
                  <span className="font-medium">{current.packageName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Harga Paket</span>
                  <span className="font-medium">
                    {formatRupiah(current.packagePrice)}
                    <span className="text-muted-foreground">/bln</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Periode Tagihan</span>
                  <span className="font-medium">
                    {current.billingPeriod === "yearly" ? "Tahunan" : "Bulanan"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={current.status === "active" ? "success" : "destructive"}>
                    {current.status === "active" ? "Aktif" : "Expired"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Masa Berlaku</span>
                  <span>{formatDate(current.akhir)}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Belum ada data langganan aktif.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade Paket</CardTitle>
          </CardHeader>
          <CardContent>
            <UpgradePackageDialog
              packages={packages}
              currentPackageId={current?.packageId}
              currentBillingPeriod={current?.billingPeriod}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
