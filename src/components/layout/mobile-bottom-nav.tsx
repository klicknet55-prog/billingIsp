"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MobileNavItem } from "@/lib/mobile/nav-config";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, match: "exact" | "prefix" = "prefix") {
  if (match === "exact") return pathname === href;
  if (href === "/portal") return pathname === href;
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({
  items,
  onAction,
}: {
  items: MobileNavItem[];
  onAction?: (id: string) => void;
}) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <nav
      className="nm-bottom-nav nm-mobile-chrome fixed inset-x-0 bottom-0 z-[800] border-t bg-background pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-1px_3px_rgba(0,0,0,0.08)] print:hidden"
      aria-label="Navigasi utama"
      style={{ touchAction: "manipulation" }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch">
        {items.map((item) => {
          if (item.type === "action") {
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction?.(item.id);
                }}
                className="flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-muted-foreground active:bg-accent/60"
                style={{ touchAction: "manipulation" }}
              >
                <item.icon className="size-5 shrink-0 pointer-events-none" />
                <span className="pointer-events-none">{item.label}</span>
              </button>
            );
          }

          const active = isActive(pathname, item.href, item.match ?? "prefix");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium active:bg-accent/60",
                active ? "text-primary" : "text-muted-foreground"
              )}
              style={{ touchAction: "manipulation" }}
            >
              <item.icon className={cn("size-5 shrink-0 pointer-events-none", active && "stroke-[2.5]")} />
              <span className={cn("pointer-events-none", active && "font-semibold")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
