"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceSummaryRow = {
  label: string;
  amount: string;
  variant: "income" | "expense" | "neutral";
};

export function FinanceSummaryCard({
  title = "Catatan Keuangan",
  rows,
  footer,
  className,
}: {
  title?: string;
  rows: FinanceSummaryRow[];
  footer?: string;
  className?: string;
}) {
  return (
    <section className={cn("fm-mobile-only px-4 pb-4", className)}>
      <div className="fm-surface-card mx-auto max-w-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">{title}</h2>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {row.variant === "income" && (
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <ArrowDownLeft className="size-4" />
                  </span>
                )}
                {row.variant === "expense" && (
                  <span className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <ArrowUpRight className="size-4" />
                  </span>
                )}
                {row.variant === "neutral" && (
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    —
                  </span>
                )}
                <span className="text-sm text-muted-foreground">{row.label}</span>
              </div>
              <span className="text-sm font-semibold">{row.amount}</span>
            </div>
          ))}
        </div>
        {footer && (
          <p className="mt-3 border-t pt-3 text-center text-xs text-muted-foreground">{footer}</p>
        )}
      </div>
    </section>
  );
}
