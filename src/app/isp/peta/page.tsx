import { PageHeader } from "@/components/layout/page-header";
import { PetaPageClient } from "@/features/maps/components/peta-page-client";
import { getMapPageData } from "@/features/maps/service";
import { listOdp } from "@/features/odp/service";
import { listRouters, listRoutersForMap } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";

export default async function PetaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const initialTab = qs.tab ?? "peta";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [mapData, odpRows, routerRows, routers] = await Promise.all([
    getMapPageData(tenantId),
    listOdp(tenantId),
    listRoutersForMap(tenantId),
    listRouters(tenantId),
  ]);

  return (
    <>
      <PageHeader title="Peta" />
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <PetaPageClient
        mapData={mapData}
        odpRows={odpRows}
        routerRows={routerRows}
        routers={routers}
        initialTab={initialTab}
      />
    </>
  );
}
