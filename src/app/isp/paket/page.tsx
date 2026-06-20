import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { deletePaketAction } from "@/features/packages/actions";
import { listPaket } from "@/features/packages/service";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import { PaketForm } from "./paket-form";
import { PaketFormDialog } from "./paket-form-dialog";

export default async function PaketPage() {
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
        description="Atur paket layanan, termasuk mapping profile PPPoE/Hotspot Mikrotik."
        action={
          <Disclosure label="Tambah Paket">
            <PaketForm routers={routerOptions} />
          </Disclosure>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kecepatan</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Router</TableHead>
                <TableHead>Profile</TableHead>
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
                    <TableCell>{p.kecepatan}</TableCell>
                    <TableCell className="uppercase">{p.tipe}</TableCell>
                    <TableCell>{router?.nama ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{profile ?? "-"}</TableCell>
                    <TableCell>{formatRupiah(p.hargaBulanan)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
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
