import { PageHeader } from "@/components/layout/page-header";
import { TunnelhostServiceLinks } from "@/components/integrations/tunnelhost-service-links";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DuitkuConfigForm, WhatsAppConfigForm } from "./integration-forms";
import { ApiKeysPanel } from "./api-keys-panel";
import { WebhookConfigPanel } from "./webhook-config-panel";
import { getGowaEnvDefaults, getKlicknetDevicePrefix } from "@/lib/integrations/whatsapp/config";
import { getCurrentTenant } from "@/lib/tenant";

export default async function IntegrasiPage() {
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
        description="Setel kredensial payment gateway dan WhatsApp khusus tenant Anda."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Duitku</CardTitle>
            <CardDescription>
              Digunakan untuk pembayaran invoice pelanggan dan langganan tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DuitkuConfigForm
              defaults={{
                merchantCode: duitku?.merchantCode,
                callbackUrl: duitku?.callbackUrl,
                inquiryUrl: duitku?.inquiryUrl,
                paymentMethod: duitku?.paymentMethod,
                isEnabled: duitku?.isEnabled ?? false,
                hasApiKey: !!duitku?.apiKeyEncrypted,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>WhatsApp API</CardTitle>
              <CardDescription>
                Digunakan untuk OTP login pelanggan dan notifikasi otomatis.
              </CardDescription>
            </div>
            <TunnelhostServiceLinks className="shrink-0" showVpn={false} />
          </CardHeader>
          <CardContent>
            <WhatsAppConfigForm
              gowaEnv={gowaEnv}
              deviceIdPrefix={deviceIdPrefix}
              defaults={{
                apiUrl: wa?.apiUrl ?? gowaEnv.baseUrl,
                provider: wa?.provider ?? (gowaEnv.baseUrl ? "klicknet" : "waba"),
                phoneNumberId: wa?.phoneNumberId,
                deviceId: wa?.deviceId,
                basicAuthUser: wa?.basicAuthUser,
                isEnabled: wa?.isEnabled ?? false,
                hasToken: !!wa?.apiTokenEncrypted,
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>REST API Key</CardTitle>
          <CardDescription>
            Akses read-only ke data tenant via Bearer token. Rate limit{" "}
            {process.env.API_RATE_LIMIT_PER_MIN ?? 60} req/menit per key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysPanel keys={apiKeys} appUrl={appUrl} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Webhook Keluar</CardTitle>
          <CardDescription>
            Terima notifikasi real-time saat tagihan lunas atau pelanggan diisolir. Circuit breaker
            setelah {WEBHOOK_CIRCUIT_BREAKER_MAX} kegagalan berturut-turut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookConfigPanel
            defaults={{
              url: webhook?.url,
              events: webhook?.events ?? [],
              isEnabled: webhook?.isEnabled ?? false,
              hasSecret: !!webhook?.secretEncrypted,
              failureCount: webhook?.failureCount ?? 0,
              lastDeliveryAt: webhook?.lastDeliveryAt ?? null,
            }}
            deliveries={deliveries}
            circuitOpen={webhook ? isWebhookCircuitOpen(webhook.failureCount) : false}
          />
        </CardContent>
      </Card>
    </>
  );
}

