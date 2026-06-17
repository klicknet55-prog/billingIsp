import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getInvoiceDetail } from "@/features/invoices/service";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";
import { PrintButton } from "./print-button";

const statusVariant = { unpaid: "warning", paid: "success", overdue: "destructive" } as const;
const statusLabel = { unpaid: "Belum bayar", paid: "Lunas", overdue: "Jatuh tempo" } as const;

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const detail = await getInvoiceDetail(user.tenantId!, id);
  if (!detail) notFound();
  const { invoice: inv } = detail;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/isp/invoice">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
        <PrintButton />
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <h1 className="text-xl font-bold">{detail.namaUsaha}</h1>
              <p className="text-sm text-muted-foreground">Invoice Layanan Internet</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold">{inv.noInvoice}</p>
              <Badge variant={statusVariant[inv.status]} className="mt-1">
                {statusLabel[inv.status]}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Ditagihkan kepada</p>
              <p className="mt-1 font-medium">{detail.pelangganNama}</p>
              <p className="text-sm text-muted-foreground">{detail.pelangganWa}</p>
              {detail.pelangganAlamat && (
                <p className="text-sm text-muted-foreground">{detail.pelangganAlamat}</p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase text-muted-foreground">Jatuh Tempo</p>
              <p className="mt-1 font-medium">{formatDate(inv.tglJatuhTempo)}</p>
              {inv.tglLunas && (
                <>
                  <p className="mt-2 text-xs uppercase text-muted-foreground">Tanggal Lunas</p>
                  <p className="font-medium">{formatDate(inv.tglLunas)}</p>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tagihan layanan</span>
              <span>{formatRupiah(inv.totalTagihan)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>
              <span>{formatRupiah(inv.totalTagihan)}</span>
            </div>
            {inv.metodeBayar && (
              <p className="mt-2 text-right text-sm text-muted-foreground">
                Metode: {inv.metodeBayar}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
