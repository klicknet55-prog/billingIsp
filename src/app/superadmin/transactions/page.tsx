import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSaasTransactions } from "@/features/tenants/service";
import { formatDate, formatRupiah } from "@/lib/utils";

const statusVariant = {
  success: "success",
  pending: "warning",
  failed: "destructive",
} as const;

export default async function TransactionsPage() {
  const tx = await listSaasTransactions();

  return (
    <>
      <PageHeader
        title="Transaksi SaaS"
        description="Rekap pembayaran langganan tenant dan donasi komunitas via Duitku."
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tx.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.duitkuOrderId}</TableCell>
                  <TableCell>
                    {t.referenceType === "donation" ? "Donasi" : "Langganan"}
                  </TableCell>
                  <TableCell>{t.paymentMethod ?? "-"}</TableCell>
                  <TableCell>{formatRupiah(t.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                </TableRow>
              ))}
              {tx.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada transaksi.
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
