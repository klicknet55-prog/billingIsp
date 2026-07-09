import { CommunityPageContent } from "@/components/community/community-page-content";
import { PageHeader } from "@/components/layout/page-header";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { requireUser } from "@/lib/auth";

export default async function DashboardCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ donationError?: string }>;
}) {
  await requireUser(["owner", "admin", "teknisi"]);
  const settings = await getPlatformSettings();
  const qs = await searchParams;

  return (
    <>
      <PageHeader title="Community" description="Info komunitas." />
      <CommunityPageContent
        settings={settings}
        canDonate
        kontributorHref="/dashboard/kontributor"
        returnTo="/dashboard/community"
        donationError={qs.donationError ? decodeURIComponent(qs.donationError) : null}
      />
    </>
  );
}
