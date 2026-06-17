import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listPelanggan } from "@/features/customers/service";
import {
  assignTicketAction,
  createTicketAction,
  updateTicketStatusAction,
} from "@/features/tickets/actions";
import { listTeknisi, listTickets } from "@/features/tickets/service";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

const statusVariant = { open: "warning", in_progress: "default", resolved: "success" } as const;
const statusLabel = { open: "Open", in_progress: "Dikerjakan", resolved: "Selesai" } as const;
const nextStatus = { open: "in_progress", in_progress: "resolved", resolved: "open" } as const;
const nextLabel = { open: "Mulai Tangani", in_progress: "Selesaikan", resolved: "Buka Lagi" } as const;

export default async function TiketPage() {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [rows, pelanggan, teknisi] = await Promise.all([
    listTickets(tenantId),
    listPelanggan(tenantId),
    listTeknisi(tenantId),
  ]);

  return (
    <>
      <PageHeader
        title="Helpdesk Tiket"
        description="Terima laporan gangguan & tetapkan teknisi."
        action={
          <Disclosure label="Buat Tiket">
            <form action={createTicketAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pelangganId">Pelanggan</Label>
                  <Select id="pelangganId" name="pelangganId" required>
                    <option value="">- Pilih -</option>
                    {pelanggan.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="judul">Judul</Label>
                  <Input id="judul" name="judul" required placeholder="Internet mati" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Textarea id="deskripsi" name="deskripsi" />
              </div>
              <Button type="submit">Simpan</Button>
            </form>
          </Disclosure>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Teknisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.judul}</TableCell>
                  <TableCell>{t.pelangganNama}</TableCell>
                  <TableCell>
                    <form action={assignTicketAction} className="flex items-center gap-1">
                      <input type="hidden" name="ticketId" value={t.id} />
                      <Select name="userId" defaultValue="" className="h-8 w-32 text-xs">
                        <option value="">{t.teknisiNama ?? "- pilih -"}</option>
                        {teknisi.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nama}
                          </option>
                        ))}
                      </Select>
                      <Button variant="ghost" size="sm" type="submit">
                        Set
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[t.status]}>{statusLabel[t.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <form action={updateTicketStatusAction} className="inline">
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="status" value={nextStatus[t.status]} />
                      <Button variant="outline" size="sm" type="submit">
                        {nextLabel[t.status]}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada tiket.
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
