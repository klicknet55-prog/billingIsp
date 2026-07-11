import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getFreeRenewalSettings,
  isPlatformDonationConfigured,
} from "@/features/saas-renewal/service";
import {
  getTenantSubscriptionStatus,
  listActiveSaasPackages,
} from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";
import { FreeRenewalCard } from "./free-renewal-card";
import { UpgradePackageDialog } from "./upgrade-package-dialog";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const ok = qs.ok === "1";

  const user = await requireUser(["owner", "admin"], { allowRenewalOnly: true });
  const tenantId = user.tenantId!;
  const [current, packages, renewalSettings] = await Promise.all([
    getTenantSubscriptionStatus(tenantId),
    listActiveSaasPackages(),
    getFreeRenewalSettings(),
  ]);
  const showFreeRenewal = current?.isFreePackage ?? false;
  const donationConfigured = isPlatformDonationConfigured();

  return (
    <>
      <PageHeader
        title="Langganan SaaS"
        description="Lihat status paket aktif dan lakukan upgrade paket berlangganan."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/referral">Program Referral</Link>
          </Button>
        }
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

      {showFreeRenewal && (
        <div className="mt-4">
          <FreeRenewalCard
            extensionDays={renewalSettings.extensionDays}
            donationConfigured={donationConfigured}
          />
        </div>
      )}
    </>
  );
}
