"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "tunggal", label: "Kirim Tunggal" },
  { id: "massal", label: "Kirim Massal" },
  { id: "template", label: "Template" },
  { id: "riwayat", label: "Riwayat" },
] as const;

export function PesanTabs({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-2">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/dashboard/pesan?tab=${tab.id}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
