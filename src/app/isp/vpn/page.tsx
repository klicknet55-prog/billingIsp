import { unstable_noStore as noStore } from "next/cache";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listTenantVpns } from "@/features/tenant-vpn/service";
import { probeVpnListenPort } from "@/features/tenant-vpn/probe";
import { getTenantVpnQuota } from "@/features/tenants/saas-access";
import { getTenantQuotaSnapshot } from "@/features/tenants/service";
import { requireFullTenantAccess } from "@/lib/auth";
import { getVpnPublicHost } from "@/lib/integrations/vpn-api";
import { VpnPageClient } from "./vpn-page-client";

export const dynamic = "force-dynamic";

export default async function VpnPage() {
  noStore();
  const user = await requireFullTenantAccess(["owner", "admin"]);
  const tenantId = user.tenantId!;

  const [rows, quota, snapshot] = await Promise.all([
    listTenantVpns(tenantId),
    getTenantVpnQuota(tenantId),
    getTenantQuotaSnapshot(tenantId),
  ]);

  if (!quota.hasFeature) {
    return (
      <>
        <PageHeader
          title="VPN Mikrotik"
          description="Buat tunnel L2TP dan port forward API router dari dashboard."
        />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Fitur VPN Mikrotik tidak tersedia di paket langganan Anda. Upgrade paket di menu
            Langganan SaaS.
          </CardContent>
        </Card>
      </>
    );
  }

  const quotaText = snapshot
    ? `${snapshot.totalVpn}/${snapshot.maxVpn ?? 0}`
    : `${quota.used}/${quota.maxVpn}`;

  const publicHost = getVpnPublicHost();
  const rowsWithProbe = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      label: r.label,
      vpnUsername: r.vpnUsername,
      staticIp: r.staticIp,
      listenPort: r.listenPort,
      destinationPort: r.destinationPort,
      status: r.status,
      portProbe: await probeVpnListenPort(publicHost, r.listenPort),
    }))
  );

  return (
    <>
      <PageHeader
        title="VPN Mikrotik"
        description={`Kelola akun VPN L2TP + NAT API router. Kuota: ${quotaText}${
          snapshot ? ` (Paket ${snapshot.paketNama})` : ""
        }`}
      />
      {rowsWithProbe.some((r) => r.portProbe === "timeout") && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-sm text-amber-900 dark:text-amber-200">
            Port NAT ({publicHost}:18000–19000) tidak dapat dijangkau dari server billing. Buka
            range port tersebut di firewall server VPN (iptables/ufw + security group cloud).
            Rule forwarding di VPN API sudah benar jika terdaftar di API.
          </CardContent>
        </Card>
      )}
      <VpnPageClient
        rows={rowsWithProbe}
        quotaText={quotaText}
        canCreate={quota.allowed}
        publicHost={publicHost}
      />
    </>
  );
}
