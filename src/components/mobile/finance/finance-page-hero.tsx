import type { ReactNode } from "react";

export function FinancePageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="fm-header-gradient px-4 pb-6 pt-2 text-white">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-white/85">{subtitle}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}
