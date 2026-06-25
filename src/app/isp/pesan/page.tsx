import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listPelanggan } from "@/features/customers/service";
import { listRecentSendLogs } from "@/features/messages/send";
import { listTenantTemplates } from "@/features/messages/templates";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";
import { BulkSendForm } from "./bulk-send-form";
import { HistoryPanel } from "./history-panel";
import { PesanTabs } from "./pesan-tabs";
import { SingleSendForm } from "./single-send-form";
import { TemplateForm } from "./template-form";

export default async function IspPesanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const { tab = "tunggal" } = await searchParams;

  const [pelanggan, routers, templates, logs] = await Promise.all([
    listPelanggan(tenantId),
    listRouters(tenantId),
    listTenantTemplates(tenantId),
    listRecentSendLogs("tenant", tenantId),
  ]);

  return (
    <>
      <PageHeader
        title="Pesan WhatsApp"
        description="Kirim pesan tunggal atau massal ke pelanggan, kelola template reminder."
      />
      <PesanTabs active={tab} />
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
