import { AlertTriangle, CalendarClock, FileText, Users, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { HintButton } from "@/components/ui/hint-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPelanggan } from "@/features/customers/service";
import { formatTagihanPeriode } from "@/features/messages/context";
import { listReceipts } from "@/features/invoices/service";
import { db } from "@/lib/db";
import { pelanggan, tagihan } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import { and, eq, inArray } from "drizzle-orm";
import { DashboardMobileHome } from "./dashboard-mobile-home";

function OutstandingList({
  rows,
  emptyLabel,
}: {
  rows: {
    id: string;
    amount: number;
    status: string;
    periode: string;
    pelangganId: string;
    nama: string;
  }[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {rows.slice(0, 5).map((row) => {
        const canPay = row.status === "open" || row.status === "tunggakan";
        return (
          <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
            <Link
              href={`/dashboard/pelanggan/${row.pelangganId}`}
              className="min-w-0 truncate font-medium hover:underline"
            >
              {row.nama}
            </Link>
            <span className="flex shrink-0 items-center gap-2">
              <span className="hidden text-muted-foreground sm:inline">
                {formatTagihanPeriode(row.periode)} · {formatRupiah(row.amount)}
              </span>
              <span className="text-muted-foreground sm:hidden">{formatRupiah(row.amount)}</span>
              {canPay ? (
                <HintButton asChild size="sm" variant="outline">
                  <Link href={`/dashboard/tagihan/${row.pelangganId}`}>Bayar</Link>
                </HintButton>
              ) : (
                <HintButton
                  size="sm"
                  variant="outline"
                  disabled
                  hint="Pembayaran sedang diproses. Tunggu konfirmasi gateway."
                >
                  Bayar
                </HintButton>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function IspDashboard() {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [customers, receipts, outstandingRows] = await Promise.all([
    listPelanggan(tenantId),
    listReceipts(tenantId),
    db
      .select({
        id: tagihan.id,
        amount: tagihan.amount,
        status: tagihan.status,
        periode: tagihan.periode,
        pelangganId: tagihan.pelangganId,
        nama: pelanggan.nama,
      })
      .from(tagihan)
      .innerJoin(pelanggan, eq(tagihan.pelangganId, pelanggan.id))
      .where(
        and(
          eq(tagihan.tenantId, tenantId),
          inArray(tagihan.status, ["open", "tunggakan", "processing"])
        )
      ),
  ]);

  const isolir = customers.filter((p) => p.isIsolated).length;
  const pendapatan = receipts.reduce((s, i) => s + i.totalTagihan, 0);

  const bulanIniRows = outstandingRows.filter((r) => r.status === "open");
  const tunggakanRows = outstandingRows.filter((r) => r.status === "tunggakan");
  const totalBulanIni = bulanIniRows.reduce((s, r) => s + r.amount, 0);
  const totalTunggakan = tunggakanRows.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <DashboardMobileHome
        pendapatan={pendapatan}
        totalBulanIni={totalBulanIni}
        totalTunggakan={totalTunggakan}
        totalPelanggan={customers.length}
        isolir={isolir}
      />

      <div className="fm-desktop-only space-y-6">
        <PageHeader title="Dashboard" description="Ringkasan operasional ISP Anda." />
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatCard compact label="Total Pelanggan" value={customers.length} icon={Users} />
        <StatCard compact label="Aktif" value={customers.length - isolir} icon={Wifi} />
        <StatCard compact label="Terisolir" value={isolir} icon={WifiOff} />
        <StatCard compact label="Pendapatan Lunas" value={formatRupiah(pendapatan)} icon={FileText} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-4">
        <StatCard
          compact
          label="Tagihan Bulan Ini"
          value={formatRupiah(totalBulanIni)}
          icon={CalendarClock}
          hint={`${bulanIniRows.length} tagihan open`}
        />
        <StatCard
          compact
          label="Tunggakan"
          value={formatRupiah(totalTunggakan)}
          icon={AlertTriangle}
          hint={`${tunggakanRows.length} periode lewat jatuh tempo`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                Tagihan Bulan Ini
                <Badge variant="warning">{bulanIniRows.length}</Badge>
              </CardTitle>
              <HintButton asChild size="sm" variant="outline">
                <Link href="/dashboard/tagihan?filter=belum-lunas">Kelola Tagihan</Link>
              </HintButton>
            </div>
          </CardHeader>
          <CardContent>
            <OutstandingList rows={bulanIniRows} emptyLabel="Tidak ada tagihan bulan ini." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                Tunggakan
                <Badge variant="destructive">{tunggakanRows.length}</Badge>
              </CardTitle>
              <HintButton asChild size="sm" variant="outline">
                <Link href="/dashboard/tagihan?filter=tunggakan">Kelola Tagihan</Link>
              </HintButton>
            </div>
          </CardHeader>
          <CardContent>
            <OutstandingList rows={tunggakanRows} emptyLabel="Tidak ada tunggakan." />
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}
