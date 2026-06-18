"use client";

import {
  BarChart3,
  Building2,
  CreditCard,
  ChevronDown,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  type LucideIcon,
  Menu,
  Network,
  Package,
  Plug,
  Router as RouterIcon,
  Settings,
  Ticket,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { SiteFooterContent } from "@/components/layout/site-footer";
import { logoutAction } from "@/features/auth/actions";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<string, NavItem[]> = {
  superadmin: [
    { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/superadmin/tenants", label: "Tenant", icon: Building2 },
    { href: "/superadmin/packages", label: "Paket SaaS", icon: Package },
    { href: "/superadmin/transactions", label: "Transaksi", icon: CreditCard },
  ],
  isp: [
    { href: "/isp", label: "Dashboard", icon: LayoutDashboard },
    { href: "/isp/pelanggan", label: "Pelanggan", icon: Users },
    { href: "/isp/paket", label: "Paket Internet", icon: Package },
    { href: "/isp/router", label: "Router", icon: RouterIcon },
    { href: "/isp/invoice", label: "Invoice", icon: FileText },
    { href: "/isp/tiket", label: "Tiket", icon: Ticket },
    { href: "/isp/laporan", label: "Laporan", icon: BarChart3 },
    { href: "/isp/staf", label: "Staf", icon: UserCog },
    { href: "/isp/integrasi", label: "Integrasi", icon: Plug },
    { href: "/isp/pengaturan", label: "Pengaturan", icon: Settings },
  ],
  kolektor: [{ href: "/kolektor", label: "Tugas Penagihan", icon: ListChecks }],
};

export function AppShell({
  variant,
  userName,
  userRole,
  brandName = DEFAULT_BRAND_NAME,
  brandLogoUrl,
  appOrigin = "",
  subscriptionInfo,
  children,
}: {
  variant: keyof typeof NAV;
  userName: string;
  userRole: string;
  brandName?: string;
  brandLogoUrl?: string | null;
  appOrigin?: string;
  subscriptionInfo?: {
    packageName: string;
    status: "active" | "expired";
    expiresAt: string;
  } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Menu tertentu dibatasi per role.
  const items = NAV[variant].filter(
    (item) =>
      (item.href !== "/isp/staf" || userRole === "owner") &&
      (item.href !== "/isp/integrasi" || userRole === "owner" || userRole === "admin")
      && (item.href !== "/isp/pengaturan" || userRole === "owner" || userRole === "admin")
  );

  const isActive = (href: string) =>
    href === `/${variant}` ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full border-r bg-card transition-transform md:static md:translate-x-0 print:hidden",
          open && "translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href={`/${variant}`} className="flex items-center gap-2 font-semibold">
            {brandLogoUrl ? (
              // URL logo tenant (direkomendasikan aspect square).
              <img
                src={brandLogoUrl}
                alt={brandName}
                className="h-6 w-6 rounded-sm object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Network className="text-primary" />
            )}
            <span className="truncate">{brandName}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </Button>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-right text-sm hover:bg-accent"
                onClick={() => setProfileOpen((v) => !v)}
              >
                <div>
                  <div className="font-medium leading-none">{userName}</div>
                  <div className="text-xs capitalize text-muted-foreground">{userRole}</div>
                </div>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-md border bg-popover p-3 shadow-md">
                  {variant === "isp" ? (
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Status Paket SaaS</div>
                        {subscriptionInfo ? (
                          <div className="mt-1">
                            <div className="font-medium">{subscriptionInfo.packageName}</div>
                            <div className="text-xs text-muted-foreground">
                              {subscriptionInfo.status === "active" ? "Aktif" : "Expired"} • Berakhir{" "}
                              {subscriptionInfo.expiresAt}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Belum ada paket langganan.
                          </div>
                        )}
                      </div>
                      {(userRole === "owner" || userRole === "admin") && (
                        <Link
                          href="/isp/langganan"
                          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                          onClick={() => setProfileOpen(false)}
                        >
                          Upgrade Paket Berlangganan
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Tidak ada pengaturan paket.</div>
                  )}
                </div>
              )}
            </div>
            <ThemeSwitcher />
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" title="Keluar" type="submit">
                <LogOut />
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <SiteFooterContent
          appOrigin={appOrigin}
          brandName={brandName}
          className="print:hidden"
        />
      </div>
    </div>
  );
}
