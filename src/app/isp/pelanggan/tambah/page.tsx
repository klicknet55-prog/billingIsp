import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPelangganAction } from "@/features/customers/actions";
import { PelangganFields } from "@/features/customers/components/pelanggan-fields";
import { listOdpFormOptions } from "@/features/odp/service";
import { listPaket } from "@/features/packages/service";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";

export default async function TambahPelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const [paket, routers, odpOptions] = await Promise.all([
    listPaket(tenantId),
    listRouters(tenantId),
    listOdpFormOptions(tenantId),
  ]);

  return (
    <>
      <div className="mb-3 md:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-10 px-2">
          <Link href="/dashboard/pelanggan">
            <ChevronLeft className="size-5" />
            Kembali
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Tambah Pelanggan"
        description="Isi data pelanggan baru."
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 md:p-5">
          <form action={createPelangganAction} className="space-y-4">
            <input type="hidden" name="fromPage" value="tambah" />
            <PelangganFields
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
              odpOptions={odpOptions}
            />
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button asChild type="button" variant="ghost" className="min-h-11">
                <Link href="/dashboard/pelanggan">Batal</Link>
              </Button>
              <Button type="submit" className="min-h-11">
                Simpan Pelanggan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
