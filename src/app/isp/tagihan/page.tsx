import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listTagihanPelanggan } from "@/features/billing/tagihan-service";
import { requireUser } from "@/lib/auth";
import { TagihanListClient } from "./tagihan-list-client";

export default async function TagihanPelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; error?: string }>;
}) {
  const qs = await searchParams;
  const filter = qs.filter ?? "belum-lunas";
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const isAdminOwner = user.role === "owner" || user.role === "admin";
  const rows = await listTagihanPelanggan(user.tenantId!);

  return (
    <>
      <PageHeader
        title="Tagihan Pelanggan"
        description="Kelola tagihan pelanggan."
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <TagihanListClient initialFilter={filter} rows={rows} isAdminOwner={isAdminOwner} />
    </>
  );
}
