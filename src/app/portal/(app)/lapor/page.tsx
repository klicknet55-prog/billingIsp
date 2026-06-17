import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createComplaintAction } from "@/features/portal/actions";
import { requirePelanggan } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

const statusVariant = { open: "warning", in_progress: "default", resolved: "success" } as const;
const statusLabel = { open: "Diterima", in_progress: "Dikerjakan", resolved: "Selesai" } as const;

export default async function LaporPage() {
  const cust = await requirePelanggan();
  const myTickets = await db.query.tickets.findMany({
    where: and(eq(tickets.tenantId, cust.tenantId), eq(tickets.pelangganId, cust.id)),
    orderBy: [desc(tickets.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lapor Gangguan</h1>
        <p className="text-sm text-muted-foreground">Sampaikan kendala koneksi Anda.</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form action={createComplaintAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="judul">Judul</Label>
              <Input id="judul" name="judul" required placeholder="Internet lambat" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea id="deskripsi" name="deskripsi" placeholder="Jelaskan kondisi..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fotoUrl">URL Foto (opsional)</Label>
              <Input id="fotoUrl" name="fotoUrl" placeholder="https://..." />
            </div>
            <Button type="submit">Kirim Laporan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Laporan Saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myTickets.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{t.judul}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</p>
              </div>
              <Badge variant={statusVariant[t.status]}>{statusLabel[t.status]}</Badge>
            </div>
          ))}
          {myTickets.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada laporan.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
