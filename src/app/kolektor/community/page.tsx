import { CommunityPageContent } from "@/components/community/community-page-content";
import { PageHeader } from "@/components/layout/page-header";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { requireUser } from "@/lib/auth";

export default async function KolektorCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ donationError?: string }>;
}) {
  await requireUser(["kolektor"]);
  const settings = await getPlatformSettings();
  const qs = await searchParams;

  return (
    <>
      <PageHeader title="Community" description="Info komunitas." />
      <CommunityPageContent
        settings={settings}
        canDonate
        kontributorHref="/kolektor/kontributor"
        returnTo="/kolektor/community"
        donationError={qs.donationError ? decodeURIComponent(qs.donationError) : null}
      />
    </>
  );
}
