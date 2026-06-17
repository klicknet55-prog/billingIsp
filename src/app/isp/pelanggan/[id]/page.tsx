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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      <Card>
        <CardContent className="p-5">
          <form action={updatePelangganAction} className="space-y-4">
            <input type="hidden" name="id" value={cust.id} />
            <PelangganFields
              defaults={cust}
              paketOptions={paket.map((p) => ({ id: p.id, label: `${p.nama} (${p.kecepatan})` }))}
              routerOptions={routers.map((r) => ({ id: r.id, label: r.nama }))}
            />
            <Button type="submit">Simpan Perubahan</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
