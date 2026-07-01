import { Pencil } from "lucide-react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { deletePaketAction } from "@/features/packages/actions";
import { listPaket } from "@/features/packages/service";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import { PaketCreateDialog, PaketFormDialog } from "./paket-form-dialog";

export default async function PaketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const qs = await searchParams;
  const success = qs.success ? decodeURIComponent(qs.success) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const [rows, routerRows] = await Promise.all([
    listPaket(user.tenantId!),
    listRouters(user.tenantId!),
  ]);
  const routerOptions = routerRows.map((r) => ({ id: r.id, nama: r.nama }));
  const routerById = new Map(routerRows.map((r) => [r.id, r]));

  return (
    <>
      <PageHeader
        title="Paket Internet"
        description="Pengaturan paket layanan"
        action={
          (user.role === "owner" || user.role === "admin") && (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="md:hidden">
                <Link href="/dashboard/paket/tambah">
                  <Plus />
                  Tambah Paket
                </Link>
              </Button>
              <div className="hidden md:contents">
                <PaketCreateDialog routers={routerOptions} />
              </div>
            </div>
          )
        }
      />

      {success && (
        <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">Kecepatan</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Router</TableHead>
                <TableHead className="hidden md:table-cell">Profile</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const router = p.routerId ? routerById.get(p.routerId) : undefined;
                const profile =
                  p.tipe === "hotspot" ? p.mikrotikProfileHotspot : p.mikrotikProfilePppoe;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nama}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.kecepatan}</TableCell>
                    <TableCell className="uppercase">{p.tipe}</TableCell>
                    <TableCell>{router?.nama ?? "-"}</TableCell>
                    <TableCell className="hidden font-mono text-xs md:table-cell">
                      {profile ?? "-"}
                    </TableCell>
                    <TableCell>{formatRupiah(p.hargaBulanan)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <PaketFormDialog
                          paket={p}
                          routers={routerOptions}
                          trigger={
                            <Button variant="ghost" size="icon" title="Edit">
                              <Pencil />
                            </Button>
                          }
                        />
                        <form action={deletePaketAction} className="inline">
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
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Belum ada paket.
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
