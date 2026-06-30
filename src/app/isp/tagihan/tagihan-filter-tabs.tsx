"use client";

import { QueryTabNav } from "@/components/ui/query-tab-nav";

const FILTERS = [
  { id: "belum-lunas", label: "Belum lunas" },
  { id: "tunggakan", label: "Tunggakan" },
  { id: "semua", label: "Semua" },
] as const;

export function TagihanFilterTabs({ active }: { active: string }) {
  return (
    <QueryTabNav
      tabs={FILTERS}
      active={active}
      basePath="/dashboard/tagihan"
      paramKey="filter"
      defaultTabId="belum-lunas"
      className="mb-4 border-b-0 pb-0"
    />
  );
}
