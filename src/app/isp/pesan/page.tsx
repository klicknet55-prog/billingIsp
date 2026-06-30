import { PageHeader } from "@/components/layout/page-header";
import { listPelanggan } from "@/features/customers/service";
import { listRecentSendLogs } from "@/features/messages/send";
import { listTenantTemplates } from "@/features/messages/templates";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";
import { PesanPageClient } from "./pesan-page-client";

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
      <PesanPageClient
        initialTab={tab}
        pelanggan={pelanggan}
        routers={routers}
        templates={templates}
        logs={logs}
      />
    </>
  );
}
