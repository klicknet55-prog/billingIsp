"use client";

import { QueryTabNav } from "@/components/ui/query-tab-nav";

const TABS = [
  { id: "tunggal", label: "Kirim Tunggal" },
  { id: "massal", label: "Kirim Massal" },
  { id: "template", label: "Template" },
  { id: "riwayat", label: "Riwayat" },
] as const;

export function PesanTabs({ active }: { active: string }) {
  return (
    <QueryTabNav
      tabs={TABS}
      active={active}
      basePath="/dashboard/pesan"
      paramKey="tab"
      defaultTabId="tunggal"
    />
  );
}
