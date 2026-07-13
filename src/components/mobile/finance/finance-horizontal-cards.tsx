"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceHorizontalItem = {
  id: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  href?: string;
  icon?: LucideIcon;
  iconBg?: string;
};

export function FinanceHorizontalCards({
  title,
  items,
  className,
}: {
  title: string;
  items: FinanceHorizontalItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className={cn("fm-mobile-only px-4 pb-2", className)}>
      <h2 className="mb-2 px-1 text-sm font-semibold">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const card = (
            <div className="fm-surface-card flex min-w-[200px] flex-col gap-2 bg-card p-4">
              <div className="flex items-center gap-2">
                {Icon && (
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full",
                      item.iconBg ?? "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  {item.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                  )}
                </div>
              </div>
              {item.actionLabel && (
                <span className="text-xs font-medium text-primary">{item.actionLabel}</span>
              )}
            </div>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className="shrink-0">
                {card}
              </Link>
            );
          }
          return (
            <div key={item.id} className="shrink-0">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
