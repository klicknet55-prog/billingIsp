import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PelangganCreateDialog } from "@/features/customers/components/pelanggan-create-dialog";
import { PelangganImportDialog } from "@/features/customers/components/pelanggan-import-dialog";
import { listPelanggan } from "@/features/customers/service";
import { listOdpFormOptions } from "@/features/odp/service";
import { listPaket } from "@/features/packages/service";
import { listRouters } from "@/features/routers/service";
import { getTenantQuotaSnapshot } from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { getMapsClient } from "@/lib/integrations/maps";
import { PelangganListClient } from "./pelanggan-list-client";

export default async function PelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; warn?: string; routerId?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const success = qs.success ? decodeURIComponent(qs.success) : "";
  const warn = qs.warn ? decodeURIComponent(qs.warn) : "";
  const routerId = qs.routerId ? decodeURIComponent(qs.routerId) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [rows, paket, routers, quota, odpOptions] = await Promise.all([
    listPelanggan(tenantId, routerId || undefined),
    listPaket(tenantId),
    listRouters(tenantId),
    getTenantQuotaSnapshot(tenantId),
    listOdpFormOptions(tenantId),
  ]);
  const maps = getMapsClient();
  const pelangganQuotaText = quota
    ? `${quota.totalPelanggan}/${quota.maxPelanggan ?? "∞"}`
    : `${rows.length}/-`;

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description={`Kuota: ${pelangganQuotaText}${
          quota ? ` (Paket ${quota.paketNama})` : ""
        }`}
        action={
          <div className="flex flex-wrap gap-2">
            <PelangganImportDialog />
            {(user.role === "owner" || user.role === "admin") && (
              <>
                <Button asChild size="sm" className="md:hidden">
                  <Link href="/dashboard/pelanggan/tambah">
                    <Plus />
                    Tambah Pelanggan
                  </Link>
                </Button>
                <div className="hidden md:contents">
                  <PelangganCreateDialog
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
                </div>
              </>
            )}
          </div>
        }
      />

      {success && (
        <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</CardContent>
        </Card>
      )}
      {warn && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-sm text-amber-800 dark:text-amber-300">{warn}</CardContent>
        </Card>
      )}
      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {routerId && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
            <span className="text-primary">Filter aktif: menampilkan pelanggan pada router terpilih.</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/pelanggan">Reset Filter</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <PelangganListClient
        rows={rows.map((p) => ({
          ...p,
          navUrl: maps.navigationUrl({ latitude: p.latitude, longitude: p.longitude }),
        }))}
      />
    </>
  );
}
