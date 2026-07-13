"use client";

import type { ReactNode } from "react";
import { MobileThemeSwitcher } from "@/components/layout/mobile-theme-switcher";
import { cn } from "@/lib/utils";
import { FinanceNotificationsBell } from "./finance-notifications-bell";

export function FinanceAppHeader({
  title,
  logo,
  subtitle,
  app,
  trailing,
  className,
}: {
  title: string;
  logo?: ReactNode;
  subtitle?: string;
  app: "admin" | "portal";
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "fm-header-gradient fm-mobile-only sticky top-0 z-[100] text-white",
        "nm-mobile-chrome-top pb-4 pt-2",
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {logo}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{title}</p>
            {subtitle && (
              <p className="truncate text-xs text-white/80">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {trailing ?? <MobileThemeSwitcher />}
          <FinanceNotificationsBell app={app} />
        </div>
      </div>
    </header>
  );
}
