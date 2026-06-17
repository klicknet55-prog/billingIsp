import Link from "next/link";
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
import { createInvoiceAction, markPaidAction } from "@/features/invoices/actions";
import { listInvoices } from "@/features/invoices/service";
import { listPelanggan } from "@/features/customers/service";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";

const statusVariant = { unpaid: "warning", paid: "success", overdue: "destructive" } as const;
const statusLabel = { unpaid: "Belum bayar", paid: "Lunas", overdue: "Jatuh tempo" } as const;

export default async function InvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ pelangganId?: string }>;
}) {
  const qs = await searchParams;
  const pelangganId = qs.pelangganId ? decodeURIComponent(qs.pelangganId) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [rows, pelanggan] = await Promise.all([
    listInvoices(tenantId, pelangganId || undefined),
    listPelanggan(tenantId),
  ]);

  return (
    <>
      <PageHeader
        title="Invoice"
        description="Buat dan pantau tagihan pelanggan."
        action={
          <Disclosure label="Buat Invoice">
            <form action={createInvoiceAction} className="grid gap-4 sm:grid-cols-3">
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
                <Label htmlFor="totalTagihan">Total</Label>
                <Input id="totalTagihan" name="totalTagihan" type="number" required placeholder="150000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tglJatuhTempo">Jatuh Tempo</Label>
                <Input id="tglJatuhTempo" name="tglJatuhTempo" type="date" />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </Disclosure>
        }
      />
      {pelangganId && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
            <span className="text-primary">Filter aktif: menampilkan invoice pelanggan terpilih.</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/isp/invoice">Reset Filter</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Invoice</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/isp/invoice/${i.id}`} className="text-primary hover:underline">
                      {i.noInvoice}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{i.pelangganNama}</TableCell>
                  <TableCell>{formatRupiah(i.totalTagihan)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(i.tglJatuhTempo)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[i.status]}>{statusLabel[i.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {i.status !== "paid" && (
                      <form action={markPaidAction} className="inline">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="metode" value="Tunai" />
                        <Button size="sm" type="submit">
                          Tandai Lunas
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada invoice.
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
