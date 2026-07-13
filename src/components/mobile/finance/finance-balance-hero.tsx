"use client";

import { Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBalanceVisibility } from "./use-balance-visibility";

export function FinanceBalanceHero({
  label,
  amount,
  amountHidden = "••••••••",
  secondaryAction,
  children,
  className,
}: {
  label: string;
  amount: string;
  amountHidden?: string;
  secondaryAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { visible, toggle } = useBalanceVisibility();

  return (
    <div className={cn("fm-mobile-only -mt-2 px-4", className)}>
      <div className="fm-surface-card mx-auto max-w-lg bg-card p-5 text-card-foreground">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full p-1.5 text-muted-foreground active:bg-muted"
            aria-label={visible ? "Sembunyikan nominal" : "Tampilkan nominal"}
          >
            {visible ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
          </button>
        </div>
        <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {visible ? amount : amountHidden}
        </p>
        {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
        {children}
      </div>
    </div>
  );
}

export function FinanceBalanceHeroAction({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  if (href) {
    return (
      <Button asChild size="sm" variant="secondary" className="rounded-full">
        <a href={href}>{children}</a>
      </Button>
    );
  }
  return (
    <Button size="sm" variant="secondary" className="rounded-full" onClick={onClick}>
      {children}
    </Button>
  );
}
