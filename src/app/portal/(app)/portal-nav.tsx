"use client";

import { Activity, FileText, Home, LogOut, MessageSquareWarning, Network } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { logoutPortalAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const links = [
  { href: "/portal", label: "Beranda", icon: Home },
  { href: "/portal/tagihan", label: "Tagihan", icon: FileText },
  { href: "/portal/diagnostik", label: "Diagnostik", icon: Activity },
  { href: "/portal/lapor", label: "Lapor", icon: MessageSquareWarning },
];

export function PortalNav({ namaUsaha }: { namaUsaha: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <Network className="text-primary" />
          {namaUsaha}
        </div>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <form action={logoutPortalAction}>
            <Button variant="ghost" size="icon" type="submit" title="Keluar">
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
        {links.map((l) => {
          const active = l.href === "/portal" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <l.icon className="size-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
