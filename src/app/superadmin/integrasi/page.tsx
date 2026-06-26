import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getPlatformWhatsAppConfigRow } from "@/features/integrations/service";
import { WhatsAppConfigForm } from "@/app/isp/integrasi/integration-forms";
import { getGowaEnvDefaults, getKlicknetDevicePrefix } from "@/lib/integrations/whatsapp/config";

export default async function SuperadminIntegrasiPage() {
  await requireUser(["superadmin"]);
  const wa = await getPlatformWhatsAppConfigRow();
  const gowaEnv = getGowaEnvDefaults();

  return (
    <>
      <PageHeader
        title="Integrasi Platform"
        description="Konfigurasi WhatsApp untuk pesan ke tenant owner dan cron SaaS."
      />
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Platform</CardTitle>
          <CardDescription>WABA atau Klicknet (GOWA) untuk superadmin.</CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppConfigForm
            scope="platform"
            gowaEnv={gowaEnv}
            deviceIdPrefix={getKlicknetDevicePrefix({ scope: "platform" })}
            defaults={{
              apiUrl: wa?.apiUrl ?? gowaEnv.baseUrl,
              provider: wa?.provider ?? (gowaEnv.baseUrl ? "klicknet" : "waba"),
              phoneNumberId: wa?.phoneNumberId,
              deviceId: wa?.deviceId,
              basicAuthUser: wa?.basicAuthUser,
              isEnabled: wa?.isEnabled ?? true,
              hasToken: !!wa?.apiTokenEncrypted,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
