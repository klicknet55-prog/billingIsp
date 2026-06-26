import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getReceiptDetail } from "@/features/billing/payment-service";
import { requirePelanggan } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { formatDate, formatRupiah } from "@/lib/utils";
import { PrintButton } from "@/app/isp/invoice/[id]/print-button";

export default async function PortalNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cust = await requirePelanggan();
  const tenant = await getCurrentTenant();
  const detail = await getReceiptDetail(cust.tenantId, id);
  if (!detail || detail.receipt.pelangganId !== cust.id) notFound();
  const { receipt: inv } = detail;
  const lineItems = inv.lineItems ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/portal/tagihan">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
        <PrintButton />
      </div>
      <Card>
        <CardContent className="p-8">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <h1 className="text-xl font-bold">{tenant?.namaUsaha ?? "ISP"}</h1>
              <p className="text-sm text-muted-foreground">Nota Pembayaran</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold">{inv.noInvoice}</p>
              <Badge variant="success" className="mt-1">
                Lunas
              </Badge>
            </div>
          </div>
          <div className="border-t pt-6">
            {lineItems.map((item) => (
              <div key={item.periode} className="flex justify-between text-sm">
                <span>{item.label}</span>
                <span>{formatRupiah(item.amount)}</span>
              </div>
            ))}
            <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>
              <span>{formatRupiah(inv.totalTagihan)}</span>
            </div>
            <p className="mt-2 text-right text-sm text-muted-foreground">
              {formatDate(inv.tglLunas)} · {inv.metodeBayar}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
