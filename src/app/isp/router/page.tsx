import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createRouterAction,
  deleteRouterAction,
  refreshRouterAction,
} from "@/features/routers/actions";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";

export default async function RouterPage() {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const rows = await listRouters(user.tenantId!);

  return (
    <>
      <PageHeader
        title="Router Mikrotik"
        description="Kelola perangkat & pantau status koneksi."
        action={
          <Disclosure label="Tambah Router">
            <form action={createRouterAction} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama</Label>
                <Input id="nama" name="nama" required placeholder="Router Pusat" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input id="ipAddress" name="ipAddress" required placeholder="192.168.88.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiPort">API Port</Label>
                <Input id="apiPort" name="apiPort" defaultValue="8728" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipe">Tipe</Label>
                <Select id="tipe" name="tipe" defaultValue="pppoe">
                  <option value="pppoe">PPPoE</option>
                  <option value="hotspot">Hotspot</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" required placeholder="admin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
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
                <TableHead>IP</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ipAddress}:{r.apiPort}</TableCell>
                  <TableCell className="uppercase">{r.tipe}</TableCell>
                  <TableCell>
                    <Badge variant={r.isOnline ? "success" : "destructive"}>
                      {r.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <form action={refreshRouterAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button variant="ghost" size="icon" title="Cek status" type="submit">
                          <RefreshCw />
                        </Button>
                      </form>
                      <form action={deleteRouterAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          Hapus
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada router.
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
