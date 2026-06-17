import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createPaketAction, deletePaketAction } from "@/features/packages/actions";
import { listPaket } from "@/features/packages/service";
import { requireUser } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";

export default async function PaketPage() {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const rows = await listPaket(user.tenantId!);

  return (
    <>
      <PageHeader
        title="Paket Internet"
        description="Atur paket layanan, termasuk mapping profile PPPoE/Hotspot Mikrotik."
        action={
          <Disclosure label="Tambah Paket">
            <form action={createPaketAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama</Label>
                <Input id="nama" name="nama" required placeholder="Home 10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kecepatan">Kecepatan</Label>
                <Input id="kecepatan" name="kecepatan" required placeholder="10 Mbps" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hargaBulanan">Harga / bln</Label>
                <Input id="hargaBulanan" name="hargaBulanan" type="number" required placeholder="150000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mikrotikProfilePppoe">Profile PPPoE Mikrotik</Label>
                <Input id="mikrotikProfilePppoe" name="mikrotikProfilePppoe" placeholder="pppoe-10mb" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mikrotikProfileHotspot">Profile Hotspot Mikrotik</Label>
                <Input id="mikrotikProfileHotspot" name="mikrotikProfileHotspot" placeholder="hs-10mb" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Simpan</Button>
              </div>
            </form>
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
                <TableHead>Profile PPPoE</TableHead>
                <TableHead>Profile Hotspot</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell>{p.kecepatan}</TableCell>
                  <TableCell className="font-mono text-xs">{p.mikrotikProfilePppoe ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{p.mikrotikProfileHotspot ?? "-"}</TableCell>
                  <TableCell>{formatRupiah(p.hargaBulanan)}</TableCell>
                  <TableCell className="text-right">
                    <form action={deletePaketAction} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <Button variant="ghost" size="sm" type="submit">
                        Hapus
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
