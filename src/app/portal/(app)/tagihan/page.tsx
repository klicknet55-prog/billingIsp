import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listInvoicesByPelanggan } from "@/features/invoices/service";
import { payInvoiceAction } from "@/features/portal/actions";
import { requirePelanggan } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function TagihanPage() {
  const cust = await requirePelanggan();
  const invoices = await listInvoicesByPelanggan(cust.tenantId, cust.id);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tagihan</h1>
      {invoices.map((i) => (
        <Card key={i.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-mono text-xs text-muted-foreground">{i.noInvoice}</p>
              <p className="text-lg font-bold">{formatRupiah(i.totalTagihan)}</p>
              <p className="text-xs text-muted-foreground">
                Jatuh tempo {formatDate(i.tglJatuhTempo)}
              </p>
            </div>
            <div className="text-right">
              {i.status === "paid" ? (
                <Badge variant="success">Lunas</Badge>
              ) : (
                <form action={payInvoiceAction} className="space-y-2">
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="metode" value="QRIS" />
                  <Button type="submit">Bayar (QRIS)</Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {invoices.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada tagihan.</p>
      )}
    </div>
  );
}
