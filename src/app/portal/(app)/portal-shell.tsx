"use client";

import { Activity, FileText, Home, LogOut, MessageSquareWarning, Network } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FinanceAppHeader,
  FinanceBottomNav,
  FinanceMobileInit,
} from "@/components/mobile/finance";
import { MobileBackHandler } from "@/components/layout/mobile-back-handler";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { logoutPortalAction } from "@/features/auth/actions";
import { PORTAL_FINANCE_NAV } from "@/lib/mobile/nav-config";
import { cn } from "@/lib/utils";

const DESKTOP_LINKS = [
  { href: "/portal", label: "Beranda", icon: Home },
  { href: "/portal/tagihan", label: "Tagihan", icon: FileText },
  { href: "/portal/lapor", label: "Lapor", icon: MessageSquareWarning },
];

export function PortalShell({
  namaUsaha,
  children,
}: {
  namaUsaha: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <FinanceMobileInit />
      <MobileBackHandler />

      {/* Mobile finance chrome */}
      <div className="fm-mobile-only">
        <FinanceAppHeader
          app="portal"
          title={namaUsaha}
          subtitle="Portal Pelanggan"
          logo={<Network className="size-8 shrink-0 text-white" />}
        />
      </div>

      {/* Desktop header */}
      <header className="fm-desktop-only sticky top-0 z-[100] border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 font-semibold">
            <Network className="size-6 shrink-0 text-primary" />
            <span className="truncate">{namaUsaha}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeSwitcher />
            <form action={logoutPortalAction}>
              <Button variant="ghost" size="icon" type="submit" title="Keluar">
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
          {DESKTOP_LINKS.map((l) => {
            const active = l.href === "/portal" ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <l.icon className="size-4" />
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/portal/diagnostik"
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              pathname.startsWith("/portal/diagnostik")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Activity className="size-4" />
            Diagnostik
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 max-md:pb-0 md:pb-4 nm-main-with-bottom-nav fm-main-with-fab-nav">
        {children}
      </main>

      <div className="fm-mobile-only">
        <FinanceBottomNav items={PORTAL_FINANCE_NAV} />
      </div>
    </div>
  );
}
