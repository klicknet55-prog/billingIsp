import { ContributorsPageContent } from "@/components/community/contributors-page-content";
import { PageHeader } from "@/components/layout/page-header";
import { listCommunityContributors } from "@/features/community-donation/service";
import { requireUser } from "@/lib/auth";

export default async function KolektorKontributorPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireUser(["kolektor"]);
  const qs = await searchParams;
  const contributors = await listCommunityContributors();

  return (
    <>
      <PageHeader title="Kontributor" description="Daftar donatur komunitas platform." />
      <ContributorsPageContent
        contributors={contributors}
        successMessage={qs.ok === "1"}
      />
    </>
  );
}
