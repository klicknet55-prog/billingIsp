"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceNavLink = {
  type: "link";
  href: string;
  label: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
};

export type FinanceNavFab = {
  type: "fab";
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
};

export type FinanceNavAction = {
  type: "action";
  id: string;
  label: string;
  icon: LucideIcon;
};

export type FinanceNavItem = FinanceNavLink | FinanceNavFab | FinanceNavAction;

function isActive(pathname: string, href: string, match: "exact" | "prefix" = "prefix") {
  if (match === "exact") return pathname === href;
  if (href.includes("#")) {
    const base = href.split("#")[0]!;
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  if (href === "/portal") return pathname === href;
  if (href === "/dashboard") return pathname === href;
  if (href === "/kolektor") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FinanceBottomNav({
  items,
  onAction,
}: {
  items: FinanceNavItem[];
  onAction?: (id: string) => void;
}) {
  const pathname = usePathname();
  if (items.length === 0) return null;

  const fabIndex = items.findIndex((i) => i.type === "fab");
  const fab = fabIndex >= 0 ? (items[fabIndex] as FinanceNavFab) : null;
  const slots = items.filter((i) => i.type !== "fab");

  return (
    <nav
      className="fm-bottom-nav nm-bottom-nav fixed inset-x-0 bottom-0 z-[800] border-t bg-background pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] print:hidden"
      aria-label="Navigasi utama"
      style={{ touchAction: "manipulation" }}
    >
      <div className="relative mx-auto flex h-16 max-w-lg items-end justify-around px-1">
        {slots.slice(0, fab ? 2 : 5).map((item) => (
          <NavSlot
            key={item.type === "link" ? item.href : item.id}
            item={item}
            pathname={pathname}
            onAction={onAction}
          />
        ))}

        {fab && (
          <div
            className="relative flex flex-1 flex-col items-center justify-end"
            style={{ marginTop: "var(--fm-nav-fab-offset)" }}
          >
            {fab.href ? (
              <Link
                href={fab.href}
                className="flex size-[var(--fm-fab-size)] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95"
                aria-label={fab.label}
              >
                <fab.icon className="size-6" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => (fab.onClick ? fab.onClick() : onAction?.(fab.id))}
                className="flex size-[var(--fm-fab-size)] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95"
                aria-label={fab.label}
              >
                <fab.icon className="size-6" />
              </button>
            )}
            <span className="mt-1 text-[10px] font-medium text-primary">{fab.label}</span>
          </div>
        )}

        {slots.slice(fab ? 2 : 5).map((item) => (
          <NavSlot
            key={item.type === "link" ? item.href : item.id}
            item={item}
            pathname={pathname}
            onAction={onAction}
          />
        ))}
      </div>
    </nav>
  );
}

function NavSlot({
  item,
  pathname,
  onAction,
}: {
  item: FinanceNavLink | FinanceNavAction;
  pathname: string;
  onAction?: (id: string) => void;
}) {
  if (item.type === "action") {
    return (
      <button
        type="button"
        onClick={() => onAction?.(item.id)}
        className="flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-muted-foreground active:bg-accent/60"
      >
        <item.icon className="size-5 shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  }

  const active = isActive(pathname, item.href, item.match ?? "prefix");
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium active:bg-accent/60",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <item.icon className={cn("size-5 shrink-0", active && "stroke-[2.5]")} />
      <span className={cn(active && "font-semibold")}>{item.label}</span>
    </Link>
  );
}
