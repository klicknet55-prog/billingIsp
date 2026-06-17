import { Download, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { addPengeluaranAction } from "@/features/reports/actions";
import {
  getFinancialSummary,
  listKategori,
  listPengeluaran,
} from "@/features/reports/service";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function LaporanPage() {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenantId = user.tenantId!;
  const [summary, spend, kategori] = await Promise.all([
    getFinancialSummary(tenantId),
    listPengeluaran(tenantId),
    listKategori(tenantId),
  ]);

  return (
    <>
      <PageHeader
        title="Laporan Keuangan"
        description="Pemasukan, pengeluaran, dan laba rugi."
        action={
          <Button asChild variant="outline">
            <a href="/isp/laporan/export">
              <Download /> Ekspor CSV
            </a>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pemasukan" value={formatRupiah(summary.pemasukan)} icon={TrendingUp} hint={`${summary.invoiceLunas} invoice lunas`} />
        <StatCard label="Pengeluaran" value={formatRupiah(summary.pengeluaran)} icon={TrendingDown} />
        <StatCard label="Laba / Rugi" value={formatRupiah(summary.laba)} icon={Wallet} />
      </div>

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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spend.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{formatDate(p.tanggal)}</TableCell>
                  <TableCell>{p.kategoriNama ?? "Umum"}</TableCell>
                  <TableCell>{p.catatan ?? "-"}</TableCell>
                  <TableCell className="text-right">{formatRupiah(p.jumlah)}</TableCell>
                </TableRow>
              ))}
              {spend.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Belum ada pengeluaran.
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
