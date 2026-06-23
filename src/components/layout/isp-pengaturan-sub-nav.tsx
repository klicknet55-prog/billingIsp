"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ISP_PENGATURAN_NAV } from "@/lib/isp-pengaturan-nav";
import { cn } from "@/lib/utils";

export function IspPengaturanSubNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-3">
      {ISP_PENGATURAN_NAV.map((item) => {
        const active =
          item.href === "/isp/pengaturan"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.description}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
