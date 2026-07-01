import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth";
import {
  getTenantDuitkuConfigRow,
  getTenantWhatsAppConfigRow,
} from "@/features/integrations/service";
import { listTenantApiKeys } from "@/features/api-keys/service";
import {
  getTenantWebhookRow,
  isWebhookCircuitOpen,
  listRecentWebhookDeliveries,
  WEBHOOK_CIRCUIT_BREAKER_MAX,
} from "@/features/webhooks/service";
import { getGowaEnvDefaults, getKlicknetDevicePrefix } from "@/lib/integrations/whatsapp/config";
import { getCurrentTenant } from "@/lib/tenant";
import { IntegrasiPageClient } from "./integrasi-page-client";
import type { WebhookEvent } from "@/lib/db/schema";

export default async function IntegrasiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const qs = await searchParams;
  const initialTab = qs.tab ?? "duitku";
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const tenant = await getCurrentTenant();
  const gowaEnv = getGowaEnvDefaults();
  const deviceIdPrefix = getKlicknetDevicePrefix({
    scope: "tenant",
    tenantId,
    tenantDomain: tenant?.domain,
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const [duitku, wa, apiKeys, webhook, deliveries] = await Promise.all([
    getTenantDuitkuConfigRow(tenantId),
    getTenantWhatsAppConfigRow(tenantId),
    listTenantApiKeys(tenantId),
    getTenantWebhookRow(tenantId),
    listRecentWebhookDeliveries(tenantId, 10),
  ]);

  return (
    <>
      <PageHeader
        title="Integrasi Tenant"
        description="Setel kredensial payment gateway dan WhatsApp."
      />
      <IntegrasiPageClient
        initialTab={initialTab}
        duitku={{
          merchantCode: duitku?.merchantCode,
          callbackUrl: duitku?.callbackUrl,
          inquiryUrl: duitku?.inquiryUrl,
          paymentMethod: duitku?.paymentMethod,
          isEnabled: duitku?.isEnabled ?? false,
          hasApiKey: !!duitku?.apiKeyEncrypted,
        }}
        wa={{
          apiUrl: wa?.apiUrl ?? gowaEnv.baseUrl,
          provider: wa?.provider ?? (gowaEnv.baseUrl ? "klicknet" : "waba"),
          phoneNumberId: wa?.phoneNumberId,
          deviceId: wa?.deviceId,
          basicAuthUser: wa?.basicAuthUser,
          isEnabled: wa?.isEnabled ?? false,
          hasToken: !!wa?.apiTokenEncrypted,
        }}
        gowaEnv={gowaEnv}
        deviceIdPrefix={deviceIdPrefix}
        apiKeys={apiKeys}
        appUrl={appUrl}
        webhook={{
          url: webhook?.url ?? undefined,
          events: (webhook?.events ?? []) as WebhookEvent[],
          isEnabled: webhook?.isEnabled ?? false,
          hasSecret: !!webhook?.secretEncrypted,
          failureCount: webhook?.failureCount ?? 0,
          lastDeliveryAt: webhook?.lastDeliveryAt ?? null,
        }}
        deliveries={deliveries}
        circuitOpen={webhook ? isWebhookCircuitOpen(webhook.failureCount) : false}
        apiRateLimit={process.env.API_RATE_LIMIT_PER_MIN ?? "60"}
        webhookMaxFailures={WEBHOOK_CIRCUIT_BREAKER_MAX}
      />
    </>
  );
}
