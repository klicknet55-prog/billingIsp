import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteSaasPackageAction } from "@/features/tenants/actions";
import { listPackages } from "@/features/tenants/service";
import { formatRupiah } from "@/lib/utils";
import { PackageFormDialog } from "./package-form";

export default async function PackagesPage() {
  const packages = await listPackages();

  return (
    <>
      <PageHeader
        title="Paket SaaS"
        description="Paket langganan yang ditawarkan ke calon tenant."
        action={
          <PackageFormDialog
            trigger={
              <Button>
                <Plus /> Tambah Paket
              </Button>
            }
          />
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{p.nama}</CardTitle>
                <Badge variant={p.isActive ? "success" : "secondary"}>
                  {p.isActive ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-primary">
                {p.hargaBulanan === 0 ? "Gratis" : formatRupiah(p.hargaBulanan)}
                {p.hargaBulanan > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">/bln</span>
                )}
              </p>
              {p.hargaBulanan > 0 && (
                <p className="text-sm text-muted-foreground">
                  Tahunan: {formatRupiah(Math.round((p.hargaBulanan * 12 * (100 - p.diskonTahunanPersen)) / 100))}
                  {p.diskonTahunanPersen > 0 && (
                    <span className="ml-1 text-primary">diskon {p.diskonTahunanPersen}%</span>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  Maks {p.limitasi.maxPelanggan} pelanggan
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-primary" />
                  Maks {p.limitasi.maxRouter} router
                </li>
                {p.limitasi.fitur.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    <span className="capitalize">{f.replace(/_/g, " ")}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2 border-t pt-4">
                <PackageFormDialog
                  pkg={p}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Pencil /> Edit
                    </Button>
                  }
                />
                <form action={deleteSaasPackageAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button variant="ghost" size="sm" type="submit">
                    <Trash2 /> Hapus
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
