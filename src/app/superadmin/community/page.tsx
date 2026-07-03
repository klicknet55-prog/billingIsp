import Link from "next/link";
import { CommunityPageContent } from "@/components/community/community-page-content";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { requireUser } from "@/lib/auth";

export default async function SuperadminCommunityPage() {
  await requireUser(["superadmin"]);
  const settings = await getPlatformSettings();

  return (
    <>
      <PageHeader
        title="Community"
        description="Info komunitas."
        action={
          <Button asChild size="sm">
            <Link href="/superadmin/mobile-apk">Upload APK</Link>
          </Button>
        }
      />
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Download APK</CardTitle>
          <CardDescription>
            Unggah APK di halaman Upload APK — link di bawah otomatis dari unggahan terakhir.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <Link href="/superadmin/mobile-apk" className="underline">
            Superadmin → Upload APK
          </Link>
        </CardContent>
      </Card>
      <CommunityPageContent settings={settings} />
    </>
  );
}
