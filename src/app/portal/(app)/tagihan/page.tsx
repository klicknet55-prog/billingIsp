import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PortalPayPanel } from "@/features/billing/portal-pay-panel";
import { getTagihanSummary } from "@/features/billing/tagihan-service";
import { tagihanBalance } from "@/features/billing/tagihan-balance";
import { listReceipts } from "@/features/invoices/service";
import { isTenantDuitkuConfigured } from "@/features/integrations/service";
import { tenantHasSaasFeature } from "@/features/tenants/saas-access";
import { requirePelanggan } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";
import Link from "next/link";

export default async function TagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const success = qs.success === "1";
  const cust = await requirePelanggan();
  const [summary, receipts] = await Promise.all([
    getTagihanSummary(cust.tenantId, cust.id),
    listReceipts(cust.tenantId, cust.id),
  ]);
  const hasPgFeature = await tenantHasSaasFeature(cust.tenantId, "payment_gateway");
  const onlinePayEnabled =
    hasPgFeature &&
    (process.env.DUITKU_DRIVER !== "real" || (await isTenantDuitkuConfigured(cust.tenantId)));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tagihan</h1>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-200">
          Pembayaran berhasil. Terima kasih.
        </div>
      )}

      <PortalPayPanel
        bulanIniAmount={summary.bulanIni ? tagihanBalance(summary.bulanIni) : 0}
        tunggakanTotal={summary.totalTunggakan}
        hasBulanIni={summary.hasBulanIni}
        hasTunggakan={summary.tunggakan.length > 0}
        onlinePayEnabled={onlinePayEnabled}
      />

      {(summary.hasBulanIni || summary.tunggakan.length > 0) && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {summary.bulanIni && tagihanBalance(summary.bulanIni) > 0 && (
              <p>
                Tagihan bulan ini: total {formatRupiah(summary.bulanIni.amount)}, sisa{" "}
                <span className="font-semibold text-foreground">
                  {formatRupiah(tagihanBalance(summary.bulanIni))}
                </span>
              </p>
            )}
            {summary.tunggakan.length > 0 && (
              <p className="mt-1">
                Total tunggakan (sisa):{" "}
                <span className="font-semibold text-foreground">
                  {formatRupiah(summary.totalTunggakan)}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {receipts.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Riwayat Pembayaran</h2>
          {receipts.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{r.noInvoice}</p>
                  <p className="font-bold">{formatRupiah(r.totalTagihan)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.tglLunas)}</p>
                </div>
                <Link href={`/portal/nota/${r.id}`} className="text-sm text-primary underline">
                  Unduh PDF
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
