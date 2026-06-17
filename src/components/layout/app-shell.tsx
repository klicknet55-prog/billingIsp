"use client";

import {
  BarChart3,
  Building2,
  CreditCard,
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
import { logoutAction } from "@/features/auth/actions";
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
  brandName = "NetManage",
  brandLogoUrl,
  children,
}: {
  variant: keyof typeof NAV;
  userName: string;
  userRole: string;
  brandName?: string;
  brandLogoUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
            <div className="text-right text-sm">
              <div className="font-medium leading-none">{userName}</div>
              <div className="text-xs capitalize text-muted-foreground">{userRole}</div>
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
      </div>
    </div>
  );
}
