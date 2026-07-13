"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FinanceQuickGrid, type FinanceQuickItem } from "./finance-quick-grid";
import { cn } from "@/lib/utils";

export function FinanceWelcomeScreen({
  brandTitle,
  greeting,
  subtitle,
  illustration,
  fastMenuItems,
  onLogin,
  loginLabel = "Login",
  layout = "split",
  children,
  className,
}: {
  brandTitle: string;
  greeting?: string;
  subtitle?: string;
  illustration?: ReactNode;
  fastMenuItems?: FinanceQuickItem[];
  onLogin?: () => void;
  loginLabel?: string;
  layout?: "split" | "fullscreen";
  children?: ReactNode;
  className?: string;
}) {
  if (layout === "fullscreen") {
    return (
      <div className={cn("fm-mobile-only fixed inset-0 z-[60] flex flex-col", className)}>
        <div className="fm-header-gradient flex min-h-0 flex-1 flex-col px-4 pb-[max(1.25rem,var(--nm-safe-bottom,0px))] pt-[max(1rem,var(--nm-safe-top,0px))] text-white">
          <div className="mx-auto w-full max-w-lg text-center">
            <p className="text-lg font-bold tracking-tight">{brandTitle}</p>
            {greeting && <p className="mt-4 text-base font-medium">{greeting}</p>}
            {subtitle && <p className="mt-1 text-sm text-white/85">{subtitle}</p>}
          </div>

          <div className="mx-auto mt-6 flex max-h-36 w-full max-w-xs shrink-0 items-center justify-center">
            {illustration ?? <DefaultIllustration />}
          </div>

          {fastMenuItems && fastMenuItems.length > 0 && (
            <div className="-mx-2 mb-4 shrink-0">
              <FinanceQuickGrid title="Menu Cepat" items={fastMenuItems} className="px-0 py-0" />
            </div>
          )}

          {children}

          {onLogin && (
            <Button
              className="mt-auto h-12 w-full max-w-lg self-center rounded-full border-0 bg-white text-base font-semibold text-primary hover:bg-white/90"
              onClick={onLogin}
            >
              {loginLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("fm-mobile-only flex min-h-[100dvh] flex-col", className)}>
      <div className="fm-header-gradient flex flex-1 flex-col px-4 pb-28 pt-[max(1rem,var(--nm-safe-top))] text-white">
        <div className="mx-auto w-full max-w-lg text-center">
          <p className="text-lg font-bold tracking-tight">{brandTitle}</p>
          {greeting && <p className="mt-4 text-base font-medium">{greeting}</p>}
          {subtitle && <p className="mt-1 text-sm text-white/85">{subtitle}</p>}
        </div>

        <div className="mx-auto mt-6 flex max-h-40 w-full max-w-xs flex-1 items-center justify-center">
          {illustration ?? <DefaultIllustration />}
        </div>
      </div>

      <div className="relative -mt-24 mx-auto w-full max-w-lg rounded-t-[1.75rem] bg-background px-4 pb-8 pt-6 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        {fastMenuItems && fastMenuItems.length > 0 && (
          <div className="-mx-2 mb-4">
            <FinanceQuickGrid title="Menu Cepat" items={fastMenuItems} className="px-0 py-0" />
          </div>
        )}

        {children}

        {onLogin && (
          <Button className="mt-4 h-12 w-full rounded-full text-base font-semibold" onClick={onLogin}>
            {loginLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function DefaultIllustration() {
  return (
    <svg viewBox="0 0 240 160" className="h-full w-full" aria-hidden>
      <circle cx="120" cy="80" r="70" fill="rgba(255,255,255,0.12)" />
      <rect x="50" y="55" width="60" height="70" rx="8" fill="rgba(255,255,255,0.9)" />
      <rect x="130" y="45" width="60" height="80" rx="8" fill="rgba(255,255,255,0.75)" />
      <circle cx="80" cy="75" r="12" fill="#2563eb" />
      <circle cx="160" cy="70" r="12" fill="#10b981" />
    </svg>
  );
}
