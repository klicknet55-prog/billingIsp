import { AppShell } from "@/components/layout/app-shell";
import { getTenantSubscriptionStatus } from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getAppOrigin } from "@/lib/site-server";
import { getCurrentTenant } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

export default async function IspLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const [tenant, subscription, appOrigin] = await Promise.all([
    getCurrentTenant(),
    user.tenantId ? getTenantSubscriptionStatus(user.tenantId) : Promise.resolve(null),
    getAppOrigin(),
  ]);
  return (
    <AppShell
      variant="isp"
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
      {children}
    </AppShell>
  );
}
