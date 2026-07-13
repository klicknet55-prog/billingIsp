"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { FinanceQuickGrid, type FinanceQuickItem } from "@/components/mobile/finance";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { DASHBOARD_MENU_ICONS } from "@/lib/mobile/dashboard-menu-icons";
import type { DashboardMenuSectionData } from "@/lib/mobile/dashboard-nav";

function toQuickItems(items: DashboardMenuSectionData["items"]): FinanceQuickItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    icon: DASHBOARD_MENU_ICONS[item.iconKey],
  }));
}

export function DashboardMobileMenu({
  sections,
  userName,
  userRole,
  subscriptionInfo,
  showSubscriptionActions,
}: {
  sections: DashboardMenuSectionData[];
  userName: string;
  userRole: string;
  subscriptionInfo?: {
    packageName: string;
    status: "active" | "expired";
    expiresAt: string;
  } | null;
  showSubscriptionActions?: boolean;
}) {
  return (
    <div className="fm-mobile-only -mx-4 -mt-4 space-y-0">
      <div className="fm-header-gradient px-4 pb-6 pt-2 text-white">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold">Menu</h1>
          <p className="mt-1 text-sm text-white/85">Semua fitur dashboard ISP</p>
          <div className="fm-surface-card mt-4 bg-card p-4 text-foreground">
            <p className="font-semibold">{userName}</p>
            <p className="text-xs capitalize text-muted-foreground">{userRole}</p>
            {subscriptionInfo && (
              <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
                <p className="font-medium text-muted-foreground">Paket SaaS</p>
                <p className="mt-0.5 font-medium">{subscriptionInfo.packageName}</p>
                <p className="text-muted-foreground">
                  {subscriptionInfo.status === "active" ? "Aktif" : "Expired"} · {subscriptionInfo.expiresAt}
                </p>
              </div>
            )}
            {showSubscriptionActions && (
              <div className="mt-3 grid gap-2">
                <Link
                  href="/dashboard/langganan"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  Kelola langganan
                </Link>
                <Link
                  href="/dashboard/referral"
                  className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-medium"
                >
                  Program referral
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-0 pb-4">
        {sections.map((section) => (
          <FinanceQuickGrid
            key={section.title}
            title={section.title}
            items={toQuickItems(section.items)}
          />
        ))}

        <div className="px-4 pb-4">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="h-12 w-full rounded-full">
              <LogOut className="size-4" />
              Keluar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
