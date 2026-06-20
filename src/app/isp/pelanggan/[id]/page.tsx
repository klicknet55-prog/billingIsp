import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updatePelangganAction } from "@/features/customers/actions";
import { PelangganFields } from "@/features/customers/components/pelanggan-fields";
import { getPelanggan } from "@/features/customers/service";
import { listPaket } from "@/features/packages/service";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";

export default async function EditPelangganPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const [cust, paket, routers] = await Promise.all([
    getPelanggan(tenantId, id),
    listPaket(tenantId),
    listRouters(tenantId),
  ]);
  if (!cust) notFound();

  return (
    <>
      <PageHeader title={`Edit: ${cust.nama}`} description="Perbarui data pelanggan." />
      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-5">
          <form action={updatePelangganAction} className="space-y-4">
            <input type="hidden" name="id" value={cust.id} />
            <PelangganFields
              defaults={cust}
              paketOptions={paket.map((p) => ({
                id: p.id,
                label: `${p.nama} (${p.kecepatan})`,
                routerId: p.routerId,
                tipe: p.tipe,
              }))}
              routerOptions={routers.map((r) => ({
                id: r.id,
                label: r.nama,
              }))}
            />
            <Button type="submit">Simpan Perubahan</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
