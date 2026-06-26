import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getReceiptDetail } from "@/features/billing/payment-service";
import { requireUser } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { formatDate, formatRupiah } from "@/lib/utils";
import { PrintButton } from "@/app/isp/invoice/[id]/print-button";

export default async function NotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const qs = await searchParams;
  const user = await requireUser(["owner", "admin", "teknisi", "kolektor"]);
  const tenant = await getCurrentTenant();
  const detail = await getReceiptDetail(user.tenantId!, id);
  if (!detail || !detail.pelanggan) notFound();
  const { receipt: inv, pelanggan: cust } = detail;
  const lineItems = inv.lineItems ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      {qs.success === "1" && (
        <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-200 print:hidden">
          Pembayaran berhasil. Nota siap diunduh.
        </div>
      )}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/isp/invoice">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
        <PrintButton />
      </div>

      <Card id="nota-print">
        <CardContent className="p-8">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <h1 className="text-xl font-bold">{tenant?.namaUsaha ?? "ISP"}</h1>
              <p className="text-sm text-muted-foreground">Nota Pembayaran Layanan Internet</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold">{inv.noInvoice}</p>
              <Badge variant="success" className="mt-1">
                Lunas
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Pelanggan</p>
              <p className="mt-1 font-medium">{cust.nama}</p>
              <p className="text-sm text-muted-foreground">{cust.noWa}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase text-muted-foreground">Tanggal Bayar</p>
              <p className="mt-1 font-medium">{formatDate(inv.tglLunas)}</p>
              <p className="mt-2 text-xs uppercase text-muted-foreground">Metode</p>
              <p className="font-medium">{inv.metodeBayar ?? "—"}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            {lineItems.length > 0 ? (
              <div className="space-y-2 text-sm">
                {lineItems.map((item) => (
                  <div key={item.periode} className="flex justify-between">
                    <span>{item.label}</span>
                    <span>{formatRupiah(item.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between text-sm">
                <span>Pembayaran tagihan</span>
                <span>{formatRupiah(inv.totalTagihan)}</span>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-lg font-bold">
              <span>Total Dibayar</span>
              <span>{formatRupiah(inv.totalTagihan)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
