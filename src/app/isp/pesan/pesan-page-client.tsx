"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PelangganRow } from "@/features/customers/service";
import type { TenantTemplateKey } from "@/features/messages/types";
import type { Router } from "@/lib/db/schema";
import type { MessageSendLog } from "@/lib/db/schema";
import { QueryTabNav } from "@/components/ui/query-tab-nav";
import { BulkSendForm } from "./bulk-send-form";
import { HistoryPanel } from "./history-panel";
import { SingleSendForm } from "./single-send-form";
import { TemplateForm } from "./template-form";

const TABS = [
  { id: "tunggal", label: "Kirim Tunggal" },
  { id: "massal", label: "Kirim Massal" },
  { id: "template", label: "Template" },
  { id: "riwayat", label: "Riwayat" },
] as const;

type PesanTabId = (typeof TABS)[number]["id"];

export function PesanPageClient({
  initialTab,
  pelanggan,
  routers,
  templates,
  logs,
}: {
  initialTab: string;
  pelanggan: PelangganRow[];
  routers: Router[];
  templates: Record<TenantTemplateKey, string>;
  logs: MessageSendLog[];
}) {
  const validTab = TABS.some((t) => t.id === initialTab) ? initialTab : "tunggal";
  const [tab, setTab] = useState<PesanTabId>(validTab as PesanTabId);

  return (
    <>
      <QueryTabNav
        tabs={TABS}
        active={tab}
        basePath="/dashboard/pesan"
        paramKey="tab"
        defaultTabId="tunggal"
        mode="client"
        onTabChange={(id) => setTab(id as PesanTabId)}
      />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            {tab === "tunggal" && "Kirim Tunggal"}
            {tab === "massal" && "Kirim Massal"}
            {tab === "template" && "Template Reminder"}
            {tab === "riwayat" && "Riwayat Kirim"}
          </CardTitle>
          {tab === "massal" && (
            <CardDescription>
              Pilih pelanggan atau filter by router. Kirim massal berjalan di background dengan
              random delay + pause 30 detik tiap 10 pesan.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {tab === "tunggal" && <SingleSendForm pelanggan={pelanggan} />}
          {tab === "massal" && <BulkSendForm pelanggan={pelanggan} routers={routers} />}
          {tab === "template" && <TemplateForm templates={templates} />}
          {tab === "riwayat" && <HistoryPanel logs={logs} />}
        </CardContent>
      </Card>
    </>
  );
}
