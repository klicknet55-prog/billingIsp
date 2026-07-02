import { CommunityPageContent } from "@/components/community/community-page-content";
import { PageHeader } from "@/components/layout/page-header";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { requireUser } from "@/lib/auth";

export default async function DashboardCommunityPage() {
  await requireUser(["owner", "admin", "teknisi"]);
  const settings = await getPlatformSettings();

  return (
    <>
      <PageHeader
        title="Community"
        description="Info komunitas."
      />
      <CommunityPageContent settings={settings} />
    </>
  );
}
