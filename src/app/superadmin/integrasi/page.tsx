import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getPlatformWhatsAppConfigRow } from "@/features/integrations/service";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { WhatsAppConfigForm } from "@/app/isp/integrasi/integration-forms";
import { getGowaEnvDefaults, getKlicknetDevicePrefix } from "@/lib/integrations/whatsapp/config";
import { MapGeocodingForm } from "./map-geocoding-form";

export default async function SuperadminIntegrasiPage() {
  await requireUser(["superadmin"]);
  const [wa, platform] = await Promise.all([
    getPlatformWhatsAppConfigRow(),
    getPlatformSettings(),
  ]);
  const gowaEnv = getGowaEnvDefaults();
  const hasEnvGoogleKey = Boolean(process.env.GOOGLE_GEOCODING_API_KEY?.trim());

  return (
    <>
      <PageHeader
        title="Integrasi Platform"
        description="Konfigurasi WhatsApp dan pencarian tempat di peta (berlaku global)."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peta — Pencarian Tempat</CardTitle>
            <CardDescription>
              Desa, kecamatan, kabupaten. Hanya superadmin yang dapat mengganti provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MapGeocodingForm
              defaults={{
                provider:
                  platform.mapGeocodingProvider === "google" ? "google" : "nominatim",
                hasGoogleApiKey: !!platform.googleGeocodingApiKeyEncrypted,
                hasEnvGoogleKey,
              }}
            />
          </CardContent>
        </Card>

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
      </div>
    </>
  );
}
