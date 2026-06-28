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
import { listReceipts } from "@/features/invoices/service";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ pelangganId?: string }>;
}) {
  const qs = await searchParams;
  const pelangganId = qs.pelangganId ? decodeURIComponent(qs.pelangganId) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const rows = await listReceipts(tenantId, pelangganId || undefined);

  return (
    <>
      <PageHeader
        title="Riwayat Nota"
        description="Nota pembayaran dibuat otomatis setelah pelanggan/admin melakukan pembayaran tagihan."
      />
      {pelangganId && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
            <span className="text-primary">Filter aktif: nota pelanggan terpilih.</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/invoice">Reset Filter</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Nota</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Tgl Bayar</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/dashboard/nota/${i.id}`} className="text-primary hover:underline">
                      {i.noInvoice}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{i.pelangganNama}</TableCell>
                  <TableCell>{formatRupiah(i.totalTagihan)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(i.tglLunas)}</TableCell>
                  <TableCell>
                    <Badge variant="success">{i.metodeBayar ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/nota/${i.id}`}>PDF</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada nota pembayaran.
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
