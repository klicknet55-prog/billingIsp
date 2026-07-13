"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceQuickItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  colorClass?: string;
};

const DEFAULT_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
];

function QuickCell({ item, colorClass }: { item: FinanceQuickItem; colorClass: string }) {
  const inner = (
    <>
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          colorClass
        )}
      >
        <item.icon className="size-6" />
      </span>
      <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight">
        {item.label}
      </span>
    </>
  );

  const className =
    "flex flex-col items-center gap-1.5 rounded-xl p-2 active:bg-muted/60";

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={item.onClick}>
      {inner}
    </button>
  );
}

export function FinanceQuickGrid({
  title = "Menu Cepat",
  items,
  className,
}: {
  title?: string;
  items: FinanceQuickItem[];
  className?: string;
}) {
  return (
    <section className={cn("fm-mobile-only px-4 py-4", className)}>
      <div className="fm-surface-card mx-auto max-w-lg bg-card p-4 text-card-foreground">
        {title && <h2 className="mb-3 text-sm font-semibold">{title}</h2>}
        <div className="grid grid-cols-4 gap-2">
          {items.map((item, i) => (
            <QuickCell
              key={item.id}
              item={item}
              colorClass={item.colorClass ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]!}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
