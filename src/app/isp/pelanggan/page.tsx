import { MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleIsolasiAction } from "@/features/customers/actions";
import { PelangganCreateDialog } from "@/features/customers/components/pelanggan-create-dialog";
import { PelangganImportDialog } from "@/features/customers/components/pelanggan-import-dialog";
import { PelangganDeleteDialog } from "@/features/customers/components/pelanggan-delete-dialog";
import { listPelanggan } from "@/features/customers/service";
import { listOdpFormOptions } from "@/features/odp/service";
import { listPaket } from "@/features/packages/service";
import { listRouters } from "@/features/routers/service";
import { getTenantQuotaSnapshot } from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { getMapsClient } from "@/lib/integrations/maps";

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
        description={`Kelola data pelanggan, koordinat, dan status koneksi. Kuota: ${pelangganQuotaText}${
          quota ? ` (Paket ${quota.paketNama})` : ""
        }`}
        action={
          <div className="flex flex-wrap gap-2">
            <PelangganImportDialog />
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="hidden md:table-cell">Username</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const nav = maps.navigationUrl({ latitude: p.latitude, longitude: p.longitude });
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nama}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{p.noWa}</TableCell>
                    <TableCell className="uppercase">{p.connectionType}</TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">
                      {p.connectionUsername ?? "-"}
                    </TableCell>
                    <TableCell>{p.paketNama ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.isIsolated ? "destructive" : "success"}>
                        {p.isIsolated ? "Terisolir" : "Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {nav && (
                          <Button asChild variant="ghost" size="icon" title="Navigasi">
                            <a href={nav} target="_blank" rel="noreferrer">
                              <MapPin />
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="icon" title="Edit">
                          <Link href={`/dashboard/pelanggan/${p.id}`}>
                            <Pencil />
                          </Link>
                        </Button>
                        <form action={toggleIsolasiAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="isolated" value={String(!p.isIsolated)} />
                          <Button variant="outline" size="sm" type="submit">
                            {p.isIsolated ? "Aktifkan" : "Isolir"}
                          </Button>
                        </form>
                        <PelangganDeleteDialog pelangganId={p.id} pelangganNama={p.nama} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Belum ada pelanggan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
