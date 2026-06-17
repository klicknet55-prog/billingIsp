import { MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createPelangganAction,
  deletePelangganAction,
  toggleIsolasiAction,
} from "@/features/customers/actions";
import { PelangganFields } from "@/features/customers/components/pelanggan-fields";
import { listPelanggan } from "@/features/customers/service";
import { listPaket } from "@/features/packages/service";
import { listRouters } from "@/features/routers/service";
import { getTenantQuotaSnapshot } from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { getMapsClient } from "@/lib/integrations/maps";

export default async function PelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [rows, paket, routers, quota] = await Promise.all([
    listPelanggan(tenantId),
    listPaket(tenantId),
    listRouters(tenantId),
    getTenantQuotaSnapshot(tenantId),
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
          <Disclosure label="Tambah Pelanggan">
            <form action={createPelangganAction} className="space-y-4">
              <PelangganFields
                paketOptions={paket.map((p) => ({ id: p.id, label: `${p.nama} (${p.kecepatan})` }))}
                routerOptions={routers.map((r) => ({ id: r.id, label: r.nama }))}
              />
              <Button type="submit">Simpan</Button>
            </form>
          </Disclosure>
        }
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>WhatsApp</TableHead>
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
                    <TableCell className="text-muted-foreground">{p.noWa}</TableCell>
                    <TableCell>{p.paketNama ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.isIsolated ? "destructive" : "success"}>
                        {p.isIsolated ? "Terisolir" : "Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {nav && (
                          <Button asChild variant="ghost" size="icon" title="Navigasi">
                            <a href={nav} target="_blank" rel="noreferrer">
                              <MapPin />
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="icon" title="Edit">
                          <Link href={`/isp/pelanggan/${p.id}`}>
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
                        <form action={deletePelangganAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button variant="ghost" size="sm" type="submit">
                            Hapus
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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
