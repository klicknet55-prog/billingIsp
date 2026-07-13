import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardMobileMenu } from "@/components/mobile/dashboard-mobile-menu";
import { getStaffAccessMode } from "@/features/tenants/saas-access";
import { getTenantSubscriptionStatus } from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import {
  buildDashboardMenuSections,
  DASHBOARD_NAV,
  filterDashboardNav,
  RENEWAL_ONLY_NAV,
} from "@/lib/mobile/dashboard-nav";
import { DASHBOARD_MENU_ICONS } from "@/lib/mobile/dashboard-menu-icons";
import { formatDate } from "@/lib/utils";

export default async function DashboardMenuPage() {
  const user = await requireUser(["owner", "admin", "teknisi"], { allowRenewalOnly: true });
  const accessMode = await getStaffAccessMode(user);
  const renewalOnly = accessMode === "renewal_only";
  const subscription = user.tenantId ? await getTenantSubscriptionStatus(user.tenantId) : null;

  const entries = renewalOnly
    ? RENEWAL_ONLY_NAV
    : filterDashboardNav(DASHBOARD_NAV, user.role, subscription?.fitur);
  const sections = buildDashboardMenuSections(entries);

  const subscriptionInfo = subscription
    ? {
        packageName: subscription.packageName,
        status: subscription.status,
        expiresAt: formatDate(subscription.akhir),
      }
    : null;

  return (
    <>
      <DashboardMobileMenu
        sections={sections}
        userName={user.nama}
        userRole={user.role}
        subscriptionInfo={subscriptionInfo}
        showSubscriptionActions={user.role === "owner" || user.role === "admin"}
      />

      <div className="fm-desktop-only space-y-6">
        <PageHeader title="Menu" description="Akses cepat ke semua fitur dashboard." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{section.title}</h2>
              <ul className="space-y-1 rounded-lg border bg-card p-2">
                {section.items.map((item) => {
                  const Icon = DASHBOARD_MENU_ICONS[item.iconKey];
                  return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Icon className="size-4 shrink-0 text-primary" />
                      {item.label}
                    </Link>
                  </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
