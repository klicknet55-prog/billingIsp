import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
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
import { TeknisiLocationPing } from "./teknisi-location-ping";

const statusVariant = { open: "warning", in_progress: "default", resolved: "success" } as const;
const statusLabel = { open: "Open", in_progress: "Dikerjakan", resolved: "Selesai" } as const;
const nextStatus = { open: "in_progress", in_progress: "resolved", resolved: "open" } as const;
const nextLabel = { open: "Mulai Tangani", in_progress: "Selesaikan", resolved: "Buka Lagi" } as const;

export default async function TiketPage({
  searchParams,
}: {
  searchParams: Promise<{ pelangganId?: string; success?: string }>;
}) {
  const qs = await searchParams;
  const pelangganId = qs.pelangganId ? decodeURIComponent(qs.pelangganId) : "";
  const success = qs.success ? decodeURIComponent(qs.success) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [rows, pelanggan, teknisi] = await Promise.all([
    listTickets(tenantId, pelangganId || undefined),
    listPelanggan(tenantId),
    listTeknisi(tenantId),
  ]);

  return (
    <>
      {user.role === "teknisi" && <TeknisiLocationPing />}
      <PageHeader
        title="Helpdesk Tiket"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="md:hidden">
              <Link href="/dashboard/tiket/tambah">
                <Plus />
                Buat Tiket
              </Link>
            </Button>
            <div className="hidden md:contents">
              <Disclosure label="Buat Tiket">
                <form action={createTicketAction} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="pelangganId">Pelanggan</Label>
                      <Select id="pelangganId" name="pelangganId" required className="w-full min-w-0">
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
            </div>
          </div>
        }
      />

      {success && (
        <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</CardContent>
        </Card>
      )}
      {pelangganId && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
            <span className="text-primary">Filter aktif: menampilkan tiket pelanggan terpilih.</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/tiket">Reset Filter</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Teknisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div>{t.judul}</div>
                    {t.deskripsi && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.deskripsi}</p>
                    )}
                  </TableCell>
                  <TableCell>{t.pelangganNama}</TableCell>
                  <TableCell>
                    {t.fotoUrl ? (
                      <a href={t.fotoUrl} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={t.fotoUrl}
                          alt="Lampiran"
                          width={48}
                          height={48}
                          className="rounded border object-cover"
                          unoptimized
                        />
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
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
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
