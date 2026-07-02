"use client";

import { Activity, FileText, Home, LogOut, MessageSquareWarning, Network } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileBackHandler } from "@/components/layout/mobile-back-handler";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileThemeToggle } from "@/components/layout/mobile-theme-toggle";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { logoutPortalAction } from "@/features/auth/actions";
import { PORTAL_NAV_ITEMS } from "@/lib/mobile/nav-config";
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
      <MobileBackHandler />
      <header className="nm-mobile-chrome-top sticky top-0 z-[100] border-b bg-background md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 md:py-3">
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 font-semibold">
            <Network className="size-6 shrink-0 text-primary" />
            <span className="truncate">{namaUsaha}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="md:hidden">
              <MobileThemeToggle />
            </div>
            <div className="hidden md:block">
              <ThemeSwitcher />
            </div>
            <form action={logoutPortalAction} className="hidden md:block">
              <Button variant="ghost" size="icon" type="submit" title="Keluar">
                <LogOut />
              </Button>
            </form>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-1 overflow-x-auto px-4 pb-2 md:flex">
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
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 max-md:pb-20 nm-main-with-bottom-nav">{children}</main>
      <MobileBottomNav items={PORTAL_NAV_ITEMS} />
    </div>
  );
}
