import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  compact,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  /** Satu baris 3 kolom di HP — teks & padding diperkecil, value truncate. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Card className="min-w-0">
        <CardContent className="p-2 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-1 sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] leading-tight text-muted-foreground sm:text-sm">
                {label}
              </p>
              <p className="mt-0.5 truncate text-xs font-bold leading-tight sm:mt-1 sm:text-2xl">
                {value}
              </p>
              {hint && (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
                  {hint}
                </p>
              )}
            </div>
            {Icon && (
              <div className="hidden shrink-0 rounded-lg bg-primary/10 p-3 text-primary sm:block">
                <Icon className="size-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
