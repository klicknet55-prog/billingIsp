import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HistoryPanel } from "@/app/isp/pesan/history-panel";
import { listRecentSendLogs, listTenantsForMessaging } from "@/features/messages/send";
import { listPlatformTemplates } from "@/features/messages/templates";
import { requireUser } from "@/lib/auth";
import { BulkTenantSendForm } from "./bulk-tenant-send-form";
import { PlatformTemplateForm } from "./platform-template-form";
import { SuperadminPesanTabs } from "./pesan-tabs";
import { SingleTenantSendForm } from "./single-tenant-send-form";

export default async function SuperadminPesanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser(["superadmin"]);
  const { tab = "tunggal" } = await searchParams;

  const [templates, logs, tenants] = await Promise.all([
    listPlatformTemplates(),
    listRecentSendLogs("platform"),
    listTenantsForMessaging(),
  ]);

  return (
    <>
      <PageHeader
        title="Pesan ke Tenant"
        description="Kirim WhatsApp ke owner tenant ISP — tunggal, massal, dan template reminder SaaS."
      />
      <SuperadminPesanTabs active={tab} />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            {tab === "tunggal" && "Kirim Tunggal"}
            {tab === "massal" && "Kirim Massal"}
            {tab === "template" && "Template Platform"}
            {tab === "riwayat" && "Riwayat"}
          </CardTitle>
          {tab === "massal" && (
            <CardDescription>
              Background job dengan random delay + pause 30 detik tiap 10 pesan.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {tab === "tunggal" && <SingleTenantSendForm tenants={tenants} />}
          {tab === "massal" && <BulkTenantSendForm tenants={tenants} />}
          {tab === "template" && <PlatformTemplateForm templates={templates} />}
          {tab === "riwayat" && <HistoryPanel logs={logs} />}
        </CardContent>
      </Card>
    </>
  );
}
