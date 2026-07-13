"use client";

import { LogOut } from "lucide-react";
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
}: {
  sections: DashboardMenuSectionData[];
}) {
  return (
    <div className="fm-mobile-only -mx-4 -mt-4 space-y-0">
      <div className="px-4 pb-4 pt-2">
        <div className="mx-auto max-w-lg">
          <h1 className="text-lg font-bold">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Semua fitur dashboard ISP</p>
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
