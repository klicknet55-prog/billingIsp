import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { StatCard } from "@/components/layout/stat-card";
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
import { LaporanDownloadButtons, LaporanFilters } from "./laporan-export-bar";
import { addPengeluaranAction } from "@/features/reports/actions";
import {
  getLaporanKeuangan,
  listLaporanPeriodOptions,
  resolveLaporanRange,
} from "@/features/reports/laporan-document";
import { getFinancialSummary, listKategori } from "@/features/reports/service";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const qs = await searchParams;
  const range = resolveLaporanRange({
    period: qs.period,
    from: qs.from,
    to: qs.to,
  });
  const periodOptions = listLaporanPeriodOptions(12);

  const [summary, kategori, laporan] = await Promise.all([
    getFinancialSummary(tenantId),
    listKategori(tenantId),
    getLaporanKeuangan(tenantId, range),
  ]);

  return (
    <>
      <div className="mb-4 flex min-w-0 max-w-full items-center justify-between gap-2">
        <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight">Laporan</h1>
        <LaporanDownloadButtons
          mode={range.mode}
          period={range.period}
          from={range.fromStr}
          to={range.toStr}
        />
      </div>

      <div className="mb-4 w-full min-w-0 max-w-full">
        <LaporanFilters
          mode={range.mode}
          period={range.period}
          from={range.fromStr}
          to={range.toStr}
          options={periodOptions}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pemasukan (periode)"
          value={formatRupiah(laporan.jumlahPemasukan)}
          icon={TrendingUp}
          hint={`${laporan.transaksi.length} transaksi`}
        />
        <StatCard
          label="Pengeluaran (periode)"
          value={formatRupiah(laporan.jumlahPengeluaran)}
          icon={TrendingDown}
        />
        <StatCard
          label="Keuntungan (periode)"
          value={formatRupiah(laporan.totalKeuntungan)}
          icon={Wallet}
          hint={`Semua waktu: ${formatRupiah(summary.laba)}`}
        />
      </div>

      <Card className="mt-6">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama pelanggan</TableHead>
                <TableHead>Nama paket</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead>Tgl Bayar</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Router</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laporan.transaksi.map((r, idx) => (
                <TableRow key={`${r.pelangganNama}-${idx}-${r.tglBayar?.getTime() ?? idx}`}>
                  <TableCell className="font-medium">{r.pelangganNama}</TableCell>
                  <TableCell>{r.paketNama}</TableCell>
                  <TableCell className="text-right">{formatRupiah(r.harga)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.tglBayar)}</TableCell>
                  <TableCell>{r.metodeBayar}</TableCell>
                  <TableCell>{r.routerNama}</TableCell>
                </TableRow>
              ))}
              {laporan.transaksi.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada transaksi di periode ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Disclosure label="Catat Pengeluaran">
          <form action={addPengeluaranAction} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="kategoriId">Kategori</Label>
              <Select id="kategoriId" name="kategoriId">
                <option value="">- Umum -</option>
                {kategori.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah</Label>
              <Input id="jumlah" name="jumlah" type="number" required placeholder="500000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catatan">Catatan</Label>
              <Input id="catatan" name="catatan" placeholder="Bayar listrik" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Disclosure>
      </div>

      <Card className="mt-6">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keperluan</TableHead>
                <TableHead className="text-right">Biaya</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laporan.pengeluaran.map((p, idx) => (
                <TableRow key={`${p.keperluan}-${idx}-${p.tanggal.getTime()}`}>
                  <TableCell>{p.keperluan}</TableCell>
                  <TableCell className="text-right">{formatRupiah(p.biaya)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(p.tanggal)}</TableCell>
                </TableRow>
              ))}
              {laporan.pengeluaran.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Tidak ada pengeluaran di periode ini.
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
