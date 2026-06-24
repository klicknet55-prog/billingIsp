import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePelanggan } from "@/lib/auth";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { PortalComplaintForm } from "./portal-complaint-form";

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
          <PortalComplaintForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Laporan Saya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {myTickets.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">{t.judul}</p>
                {t.deskripsi && (
                  <p className="text-sm text-muted-foreground">{t.deskripsi}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</p>
                {t.fotoUrl && (
                  <a
                    href={t.fotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block"
                  >
                    <Image
                      src={t.fotoUrl}
                      alt="Lampiran laporan"
                      width={120}
                      height={90}
                      className="rounded-md border object-cover"
                      unoptimized
                    />
                  </a>
                )}
              </div>
              <Badge variant={statusVariant[t.status]} className="shrink-0 self-start">
                {statusLabel[t.status]}
              </Badge>
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
