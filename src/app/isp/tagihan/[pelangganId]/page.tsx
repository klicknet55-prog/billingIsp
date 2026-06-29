import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CatatNunggakButton } from "@/features/billing/catat-nunggak-button";
import { PartialPayPanel } from "@/features/billing/partial-pay-panel";
import { PayTagihanPanel } from "@/features/billing/pay-tagihan-panel";
import {
  canCatatNunggak,
  getTagihanForPelanggan,
  getTagihanPaymentHistory,
  getTagihanSummary,
  getPaketHarga,
  syncTagihanForPelanggan,
} from "@/features/billing/tagihan-service";
import { tagihanBalance } from "@/features/billing/tagihan-balance";
import { getPelanggan } from "@/features/customers/service";
import { formatTagihanPeriode } from "@/features/messages/context";
import { requireUser } from "@/lib/auth";
import { isPastDue } from "@/features/jobs/due-date";
import { formatDate, formatRupiah } from "@/lib/utils";

const TAGIHAN_STATUS_LABEL: Record<string, string> = {
  open: "Open (belum lunas)",
  tunggakan: "Tunggakan",
  partial: "Lunas sebagian",
  processing: "Diproses",
  paid: "Lunas",
};

export default async function TagihanPelangganDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ pelangganId: string }>;
  searchParams: Promise<{ error?: string; success?: string; msg?: string }>;
}) {
  const { pelangganId } = await params;
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const successMsg = qs.msg ? decodeURIComponent(qs.msg) : qs.success ? "Berhasil." : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const isAdminOwner = user.role === "owner" || user.role === "admin";
  const now = new Date();

  await syncTagihanForPelanggan(tenantId, pelangganId, now);

  const [cust, summary, history, paymentHistory, showCatatNunggak, hargaPaket] = await Promise.all([
    getPelanggan(tenantId, pelangganId),
    getTagihanSummary(tenantId, pelangganId),
    getTagihanForPelanggan(tenantId, pelangganId),
    getTagihanPaymentHistory(tenantId, pelangganId),
    isAdminOwner ? canCatatNunggak(tenantId, pelangganId, now) : Promise.resolve(false),
    getPaketHarga(tenantId, pelangganId),
  ]);
  if (!cust) notFound();

  const isOverdueOpen =
    summary.bulanIni && isPastDue(summary.bulanIni.dueDate, now);
  const pastDueUnpaid =
    isPastDue(summary.activeDueDate, now) && !summary.hasBulanIni && summary.tunggakan.length === 0;

  const partialOptions = [
    ...(summary.bulanIni
      ? [
          {
            id: summary.bulanIni.id,
            periode: summary.bulanIni.periode,
            balance: tagihanBalance(summary.bulanIni),
          },
        ]
      : []),
    ...summary.tunggakan.map((t) => ({
      id: t.id,
      periode: t.periode,
      balance: tagihanBalance(t),
    })),
  ];

  return (
    <>
      <PageHeader
        title={`Tagihan — ${cust.nama}`}
        description={`Periode aktif ${formatTagihanPeriode(summary.activePeriode)} · jatuh tempo ${formatDate(summary.activeDueDate)}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/tagihan">← Daftar Tagihan</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={cust.isIsolated ? "destructive" : "success"}>
          {cust.isIsolated ? "Terisolir" : "Aktif"}
        </Badge>
        {summary.hasBulanIni && (
          <Badge variant={isOverdueOpen ? "destructive" : "warning"}>
            {isOverdueOpen ? "Lewat jatuh tempo (open)" : "Tagihan open"}
          </Badge>
        )}
        {summary.tunggakan.length > 0 && (
          <Badge variant="destructive">{summary.tunggakan.length} tunggakan</Badge>
        )}
      </div>

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {successMsg && (
        <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 text-sm text-emerald-700 dark:text-emerald-400">
            {successMsg}
          </CardContent>
        </Card>
      )}

      {hargaPaket <= 0 && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-sm text-amber-900 dark:text-amber-100">
            Pelanggan belum memiliki paket internet aktif — tagihan tidak dapat dibuat.
          </CardContent>
        </Card>
      )}

      {pastDueUnpaid && hargaPaket > 0 && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">
            Lewat jatuh tempo {formatDate(summary.activeDueDate)}. Tagihan seharusnya sudah dibuat
            otomatis — muat ulang halaman. Jika masih kosong, hubungi support.
          </CardContent>
        </Card>
      )}

      {isAdminOwner && showCatatNunggak && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <CatatNunggakButton pelangganId={cust.id} />
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-5">
          <PayTagihanPanel
            pelangganId={cust.id}
            pelangganNama={cust.nama}
            bulanIniAmount={summary.bulanIni ? tagihanBalance(summary.bulanIni) : 0}
            tunggakanTotal={summary.totalTunggakan}
            hasBulanIni={summary.hasBulanIni}
            hasTunggakan={summary.tunggakan.length > 0}
          />
          {isAdminOwner && (
            <div className="mt-4 border-t pt-4">
              <PartialPayPanel pelangganId={cust.id} options={partialOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Tagihan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Dibayar</TableHead>
                <TableHead>Sisa</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatTagihanPeriode(t.periode)}</TableCell>
                  <TableCell>{formatRupiah(t.amount)}</TableCell>
                  <TableCell>{formatRupiah(t.amountPaid ?? 0)}</TableCell>
                  <TableCell>{formatRupiah(tagihanBalance(t))}</TableCell>
                  <TableCell>{formatDate(t.dueDate)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === "paid"
                          ? "success"
                          : t.status === "tunggakan"
                            ? "destructive"
                            : t.status === "partial"
                              ? "warning"
                              : t.status === "open"
                                ? "warning"
                                : "secondary"
                      }
                    >
                      {TAGIHAN_STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Belum ada riwayat tagihan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {paymentHistory.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Metode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((p) => (
                  <TableRow key={p.linkId}>
                    <TableCell>{p.paidAt ? formatDate(p.paidAt) : "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.noNota}</TableCell>
                    <TableCell>{formatTagihanPeriode(p.periode)}</TableCell>
                    <TableCell>{formatRupiah(p.amount)}</TableCell>
                    <TableCell>{p.metode ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
