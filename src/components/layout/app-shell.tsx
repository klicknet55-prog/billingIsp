"use client";

import {
  BarChart3,
  Building2,
  HandCoins,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  HardDrive,
  LayoutDashboard,
  ListChecks,
  LogOut,
  type LucideIcon,
  Map,
  Menu,
  MessageSquare,
  Network,
  Package,
  Plug,
  Rocket,
  Router as RouterIcon,
  Settings,
  Shield,
  Ticket,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { MobileMenuDrawer } from "@/components/layout/mobile-menu-drawer";
import { MobileThemeToggle } from "@/components/layout/mobile-theme-toggle";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { SiteFooterContent } from "@/components/layout/site-footer-content";
import { logoutAction } from "@/features/auth/actions";
import { SUPERADMIN_PENGATURAN_HREF } from "@/lib/superadmin-pengaturan-nav";
import { adminNavItems } from "@/lib/mobile/nav-config";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";
import { MobileBackHandler } from "@/components/layout/mobile-back-handler";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: readonly string[];
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

type DashboardNavEntry = NavItem | NavGroup;

function isNavGroup(entry: DashboardNavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV: Record<string, NavItem[]> = {
  superadmin: [
    { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/superadmin/tenants", label: "Tenant", icon: Building2 },
    { href: "/superadmin/packages", label: "Paket SaaS", icon: Package },
    { href: "/superadmin/transactions", label: "Transaksi", icon: CreditCard },
    { href: SUPERADMIN_PENGATURAN_HREF, label: "Pengaturan", icon: Settings },
    { href: "/superadmin/backup", label: "Backup", icon: HardDrive },
    { href: "/superadmin/deploy", label: "Update App", icon: Rocket },
    { href: "/superadmin/integrasi", label: "Integrasi", icon: Plug },
    { href: "/superadmin/pesan", label: "Pesan", icon: MessageSquare },
    { href: "/superadmin/community", label: "Community", icon: HandCoins },
  ],
  kolektor: [
    { href: "/kolektor", label: "Tugas Penagihan", icon: ListChecks },
    { href: "/kolektor/community", label: "Community", icon: HandCoins },
  ],
};

const DASHBOARD_NAV: DashboardNavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/dashboard/tagihan", label: "Tagihan Pelanggan", icon: CreditCard },
  { href: "/dashboard/peta", label: "Peta", icon: Map },
  { href: "/dashboard/paket", label: "Paket Internet", icon: Package },
  { href: "/dashboard/router", label: "Router", icon: RouterIcon },
  { href: "/dashboard/invoice", label: "Nota", icon: FileText },
  { href: "/dashboard/pesan", label: "Pesan", icon: MessageSquare, roles: ["owner", "admin"] },
  { href: "/dashboard/laporan", label: "Laporan", icon: BarChart3 },
  {
    id: "administrator",
    label: "Administrator",
    icon: Shield,
    children: [
      { href: "/dashboard/staf", label: "Staf", icon: UserCog, roles: ["owner"] },
      {
        href: "/dashboard/kolektor-pelanggan",
        label: "Area Kolektor",
        icon: UserCheck,
        roles: ["owner", "admin"],
      },
      { href: "/dashboard/tiket", label: "Tiket", icon: Ticket },
    ],
  },
  {
    href: "/dashboard/integrasi",
    label: "Integrasi",
    icon: Plug,
    roles: ["owner", "admin"],
  },
  {
    href: "/dashboard/pengaturan",
    label: "Pengaturan",
    icon: Settings,
    roles: ["owner", "admin"],
  },
  { href: "/dashboard/community", label: "Community", icon: HandCoins },
];

function canSeeNavItem(item: NavItem, userRole: string): boolean {
  if (!item.roles) return true;
  return item.roles.includes(userRole);
}

function filterDashboardNav(entries: DashboardNavEntry[], userRole: string): DashboardNavEntry[] {
  return entries
    .map((entry) => {
      if (!isNavGroup(entry)) {
        return canSeeNavItem(entry, userRole) ? entry : null;
      }
      const children = entry.children.filter((child) => canSeeNavItem(child, userRole));
      if (children.length === 0) return null;
      return { ...entry, children };
    })
    .filter((entry): entry is DashboardNavEntry => entry !== null);
}

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
  variant: "superadmin" | "dashboard" | "kolektor";
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
  const hasMobileBottomNav = variant === "dashboard" || variant === "kolektor";
  const mobileNavItems = hasMobileBottomNav ? adminNavItems(userRole) : [];
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const profileRef = useRef<HTMLDivElement>(null);
  const slimMobileHeader = hasMobileBottomNav;
  const dashboardHomeHref = variant === "kolektor" ? "/kolektor" : `/${variant === "dashboard" ? "dashboard" : variant}`;

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (profileRef.current?.contains(e.target as Node)) return;
      setProfileOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  useEffect(() => {
    setNavReady(true);
  }, []);

  const dashboardEntries =
    variant === "dashboard" ? filterDashboardNav(DASHBOARD_NAV, userRole) : [];
  const flatItems = variant !== "dashboard" ? NAV[variant] : [];

  const isActivePath = (href: string) => {
    if (href === SUPERADMIN_PENGATURAN_HREF) {
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    return href === `/${variant}` ? pathname === href : pathname.startsWith(href);
  };

  useEffect(() => {
    if (variant !== "dashboard") return;
    for (const entry of filterDashboardNav(DASHBOARD_NAV, userRole)) {
      if (!isNavGroup(entry)) continue;
      const childActive = entry.children.some((child) => {
        const href = child.href;
        return href === `/${variant}` ? pathname === href : pathname.startsWith(href);
      });
      if (childActive) {
        setExpandedGroups((prev) => ({ ...prev, [entry.id]: true }));
      }
    }
  }, [pathname, variant, userRole]);

  const linkActive = (href: string) => navReady && isActivePath(href);

  const navLinkClass = (href: string, nested = false) =>
    cn(
      "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
      nested ? "px-3 pl-9" : "px-3",
      linkActive(href)
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    );

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const groupChildActive = (group: NavGroup) =>
    group.children.some((child) => isActivePath(child.href));

  return (
    <div className="flex min-h-screen">
      <MobileBackHandler />
      {/* Sidebar desktop — tidak di-render di mobile agar tidak menangkap tap */}
      <aside className="hidden md:sticky md:top-0 md:z-30 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col border-r bg-card print:hidden">
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center border-b px-4">
            <Link href={`/${variant}`} className="flex items-center gap-2 font-semibold">
              {brandLogoUrl ? (
                <BrandLogo logoUrl={brandLogoUrl} name={brandName} className="h-6 w-6 rounded-sm object-cover" />
              ) : (
                <Network className="text-primary" />
              )}
              <span className="truncate">{brandName}</span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" suppressHydrationWarning>
            {variant === "dashboard"
              ? dashboardEntries.map((entry) => {
                  if (!isNavGroup(entry)) {
                    return (
                      <Link
                        key={entry.href}
                        href={entry.href}
                        onClick={() => setOpen(false)}
                        className={navLinkClass(entry.href)}
                      >
                        <entry.icon className="size-4 shrink-0" />
                        {entry.label}
                      </Link>
                    );
                  }

                  const expanded = expandedGroups[entry.id] ?? groupChildActive(entry);
                  return (
                    <div key={entry.id} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleGroup(entry.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          groupChildActive(entry)
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <entry.icon className="size-4 shrink-0" />
                        <span className="flex-1 text-left">{entry.label}</span>
                        {expanded ? (
                          <ChevronDown className="size-4 shrink-0 opacity-70" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 opacity-70" />
                        )}
                      </button>
                      {expanded && (
                        <div className="space-y-0.5">
                          {entry.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className={navLinkClass(child.href, true)}
                            >
                              <child.icon className="size-4 shrink-0" />
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              : flatItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={navLinkClass(item.href)}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="nm-mobile-chrome nm-mobile-chrome-top sticky top-0 z-[400] flex h-14 shrink-0 items-center border-b bg-background px-4 print:hidden md:z-[100] md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/80">
          {slimMobileHeader && (
            <div className="flex w-full items-center justify-between gap-3 md:hidden">
              <Link
                href={dashboardHomeHref}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 font-semibold"
                style={{ touchAction: "manipulation" }}
              >
                {brandLogoUrl ? (
                  <BrandLogo
                    logoUrl={brandLogoUrl}
                    name={brandName}
                    className="h-7 w-7 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <Network className="size-6 shrink-0 text-primary" />
                )}
                <span className="truncate">{brandName}</span>
              </Link>
              <MobileThemeToggle />
            </div>
          )}

          <div
            className={cn(
              "flex w-full items-center justify-between",
              slimMobileHeader && "hidden md:flex"
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-11 touch-manipulation md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <div className="flex flex-1 items-center justify-end gap-1 sm:gap-3">
              <div className="relative hidden md:block" ref={profileRef}>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-right text-sm hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen((v) => !v);
                  }}
                >
                  <div>
                    <div className="font-medium leading-none">{userName}</div>
                    <div className="text-xs capitalize text-muted-foreground">{userRole}</div>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-11 z-[60] w-72 rounded-md border bg-popover p-3 shadow-md">
                    {variant === "dashboard" ? (
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
                            href="/dashboard/langganan"
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
              <form action={logoutAction} className="hidden md:block">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 touch-manipulation"
                  title="Keluar"
                  type="submit"
                >
                  <LogOut />
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main
          className={cn(
            "flex-1 p-4 md:p-6",
            hasMobileBottomNav && "max-md:pb-20 nm-main-with-bottom-nav"
          )}
        >
          {children}
        </main>
        <SiteFooterContent
          appOrigin={appOrigin}
          brandName={brandName}
          className={cn("print:hidden", hasMobileBottomNav && "max-md:hidden")}
        />
      </div>
      {hasMobileBottomNav && (
        <MobileBottomNav
          items={mobileNavItems}
          onAction={(id) => {
            if (id === "menu") setOpen(true);
          }}
        />
      )}
      <MobileMenuDrawer open={open} onClose={() => setOpen(false)} title={brandName}>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" suppressHydrationWarning>
          {variant === "dashboard"
            ? dashboardEntries.map((entry) => {
                if (!isNavGroup(entry)) {
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      onClick={() => setOpen(false)}
                      className={navLinkClass(entry.href)}
                    >
                      <entry.icon className="size-4 shrink-0" />
                      {entry.label}
                    </Link>
                  );
                }

                const expanded = expandedGroups[entry.id] ?? groupChildActive(entry);
                return (
                  <div key={entry.id} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => toggleGroup(entry.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        groupChildActive(entry)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <entry.icon className="size-4 shrink-0" />
                      <span className="flex-1 text-left">{entry.label}</span>
                      {expanded ? (
                        <ChevronDown className="size-4 shrink-0 opacity-70" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 opacity-70" />
                      )}
                    </button>
                    {expanded && (
                      <div className="space-y-0.5">
                        {entry.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={navLinkClass(child.href, true)}
                          >
                            <child.icon className="size-4 shrink-0" />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            : flatItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={navLinkClass(item.href)}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
        </nav>
        {slimMobileHeader && (
          <div className="shrink-0 border-t p-3">
            <p className="font-medium leading-snug">{userName}</p>
            <p className="text-xs capitalize text-muted-foreground">{userRole}</p>
            {variant === "dashboard" && subscriptionInfo && (
              <div className="mt-3 rounded-md border bg-muted/40 p-2 text-xs">
                <p className="font-medium text-muted-foreground">Paket SaaS</p>
                <p className="mt-0.5 font-medium">{subscriptionInfo.packageName}</p>
                <p className="text-muted-foreground">
                  {subscriptionInfo.status === "active" ? "Aktif" : "Expired"} ·{" "}
                  {subscriptionInfo.expiresAt}
                </p>
              </div>
            )}
            {variant === "dashboard" && (userRole === "owner" || userRole === "admin") && (
              <Link
                href="/dashboard/langganan"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Kelola langganan
              </Link>
            )}
            <form action={logoutAction} className="mt-3">
              <Button type="submit" variant="outline" className="w-full touch-manipulation">
                <LogOut className="size-4" />
                Keluar
              </Button>
            </form>
          </div>
        )}
      </MobileMenuDrawer>
    </div>
  );
}
