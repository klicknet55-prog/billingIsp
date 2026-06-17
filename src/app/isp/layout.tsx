import { AppShell } from "@/components/layout/app-shell";
import { getTenantSubscriptionStatus } from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

export default async function IspLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const [tenant, subscription] = await Promise.all([
    getCurrentTenant(),
    user.tenantId ? getTenantSubscriptionStatus(user.tenantId) : Promise.resolve(null),
  ]);
  return (
    <AppShell
      variant="isp"
      userName={user.nama}
      userRole={user.role}
      brandName={tenant?.namaUsaha ?? "NetManage"}
      brandLogoUrl={tenant?.logoUrl ?? null}
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
