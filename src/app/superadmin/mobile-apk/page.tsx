import Link from "next/link";
import { Smartphone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { requireUser } from "@/lib/auth";
import { hostnameFromOrigin, domainSlugFromOrigin } from "@/lib/mobile/apk-filename";
import { getAppOrigin } from "@/lib/site-server";
import { MobileApkUploadPanel } from "./mobile-apk-upload-panel";

export default async function SuperadminMobileApkPage() {
  await requireUser(["superadmin"]);
  const [settings, appOrigin] = await Promise.all([
    getPlatformSettings(),
    getAppOrigin(),
  ]);

  const origin =
    appOrigin || process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const host = origin ? hostnameFromOrigin(origin) : "—";
  const slug = origin ? domainSlugFromOrigin(origin) : "domain";

  return (
    <>
      <PageHeader
        title="Upload APK"
        description="Unggah APK Admin.net & MyWiFi — link download otomatis masuk halaman Community."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/superadmin/community">Lihat Community →</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            Distribusi APK
          </CardTitle>
          <CardDescription>
            File disimpan sebagai{" "}
            <code className="rounded bg-muted px-1">{slug}-Admin.net-release.apk</code> dan{" "}
            <code className="rounded bg-muted px-1">{slug}-MyWiFi-release.apk</code> (domain{" "}
            <span className="font-medium">{host}</span>). URL Community diperbarui otomatis setelah
            unggah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!origin ? (
            <p className="text-sm text-destructive">
              Set <code>NEXT_PUBLIC_APP_URL</code> di .env production agar link download absolut
              benar.
            </p>
          ) : (
            <MobileApkUploadPanel
              appOrigin={origin}
              communityApkAdminUrl={settings.communityApkAdminUrl}
              communityApkPortalUrl={settings.communityApkPortalUrl}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
