import { PageHeader } from "@/components/layout/page-header";
import { TunnelhostServiceLinks } from "@/components/integrations/tunnelhost-service-links";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  getTenantDuitkuConfigRow,
  getTenantWhatsAppConfigRow,
} from "@/features/integrations/service";
import { DuitkuConfigForm, WhatsAppConfigForm } from "./integration-forms";
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
  const [duitku, wa] = await Promise.all([
    getTenantDuitkuConfigRow(tenantId),
    getTenantWhatsAppConfigRow(tenantId),
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
    </>
  );
}

