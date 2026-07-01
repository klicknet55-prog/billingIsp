import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { WrongAppScreen } from "@/components/layout/wrong-app-screen";
import { Card, CardContent } from "@/components/ui/card";
import { startOfDay } from "@/features/jobs/billing";
import { getTenantSubscriptionStatus } from "@/features/tenants/service";
import { getCurrentActor, requireUser } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getAppOrigin } from "@/lib/site-server";
import { getCurrentTenant } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

function daysUntilExpiry(akhir: Date): number {
  const now = new Date();
  const DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(akhir).getTime() - startOfDay(now).getTime()) / DAY);
}

export default async function IspLayout({ children }: { children: React.ReactNode }) {
  const actor = await getCurrentActor();
  if (actor?.type === "pelanggan") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <WrongAppScreen variant="admin-for-pelanggan" />
      </div>
    );
  }

  const user = await requireUser(["owner", "admin", "teknisi"]);
  const [tenant, subscription, appOrigin] = await Promise.all([
    getCurrentTenant(),
    user.tenantId ? getTenantSubscriptionStatus(user.tenantId) : Promise.resolve(null),
    getAppOrigin(),
  ]);

  const showSubBanner =
    subscription &&
    (user.role === "owner" || user.role === "admin");
  const daysLeft = subscription ? daysUntilExpiry(subscription.akhir) : 0;

  return (
    <AppShell
      variant="dashboard"
      userName={user.nama}
      userRole={user.role}
      brandName={tenant?.namaUsaha ?? DEFAULT_BRAND_NAME}
      brandLogoUrl={tenant?.logoUrl ?? null}
      appOrigin={appOrigin}
      subscriptionInfo={
        subscription
          ? {
              packageName: subscription.packageName,
              status: subscription.status,
              expiresAt: formatDate(subscription.akhir),
            }
          : null
      }
    >
      {showSubBanner && subscription!.status === "expired" && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">
            Langganan platform berakhir {formatDate(subscription!.akhir)}. Akses ISP ditangguhkan
            setelah cron berjalan —{" "}
            <Link href="/dashboard/langganan" className="font-medium underline">
              perpanjang langganan
            </Link>
            .
          </CardContent>
        </Card>
      )}
      {showSubBanner && subscription!.status === "active" && daysLeft <= 7 && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-sm text-amber-900 dark:text-amber-200">
            Langganan platform berakhir {formatDate(subscription!.akhir)}
            {daysLeft <= 0 ? " (hari ini)" : daysLeft === 1 ? " (besok)" : ` (${daysLeft} hari lagi)`}.{" "}
            <Link href="/dashboard/langganan" className="font-medium underline">
              Perpanjang sekarang
            </Link>
            .
          </CardContent>
        </Card>
      )}
      {children}
    </AppShell>
  );
}
