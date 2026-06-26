import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listTagihanPelanggan,
  type TagihanPelangganStatus,
} from "@/features/billing/tagihan-service";
import { formatTagihanPeriode } from "@/features/messages/context";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";

const STATUS_LABEL: Record<TagihanPelangganStatus, string> = {
  open: "Bulan ini",
  tunggakan: "Tunggakan",
  not_due: "Belum waktunya",
  clear: "Lunas",
};

const STATUS_VARIANT: Record<
  TagihanPelangganStatus,
  "warning" | "destructive" | "secondary" | "success"
> = {
  open: "warning",
  tunggakan: "destructive",
  not_due: "secondary",
  clear: "success",
};

export default async function TagihanPelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; error?: string }>;
}) {
  const qs = await searchParams;
  const filter = qs.filter ?? "belum-lunas";
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const isAdminOwner = user.role === "owner" || user.role === "admin";
  const rows = await listTagihanPelanggan(user.tenantId!);

  const filtered = rows.filter((r) => {
    if (filter === "semua") return true;
    if (filter === "tunggakan") return r.status === "tunggakan" || r.tunggakanCount > 0;
    return r.status === "open" || r.status === "tunggakan" || r.isIsolated;
  });

  const filterLink = (value: string) =>
    value === "belum-lunas" ? "/isp/tagihan" : `/isp/tagihan?filter=${value}`;

  return (
    <>
      <PageHeader
        title="Tagihan Pelanggan"
        description="Kelola tagihan bulan ini, tunggakan, dan pembayaran — terpisah dari data pelanggan."
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant={filter === "belum-lunas" ? "default" : "outline"} size="sm">
          <Link href={filterLink("belum-lunas")}>Belum lunas</Link>
        </Button>
        <Button asChild variant={filter === "tunggakan" ? "default" : "outline"} size="sm">
          <Link href={filterLink("tunggakan")}>Tunggakan</Link>
        </Button>
        <Button asChild variant={filter === "semua" ? "default" : "outline"} size="sm">
          <Link href={filterLink("semua")}>Semua</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead className="hidden md:table-cell">Periode aktif</TableHead>
                <TableHead>Jatuh tempo</TableHead>
                <TableHead className="hidden md:table-cell">Bulan ini</TableHead>
                <TableHead className="hidden md:table-cell">Tunggakan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const canPay = r.status === "open" || r.status === "tunggakan";
                return (
                  <TableRow key={r.pelangganId}>
                    <TableCell>
                      <div className="font-medium">{r.nama}</div>
                      <div className="text-xs text-muted-foreground">{r.noWa}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.paketNama ?? "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatTagihanPeriode(r.activePeriode)}
                    </TableCell>
                    <TableCell>{formatDate(r.activeDueDate)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.bulanIni ? formatRupiah(r.bulanIni.amount) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.tunggakanCount > 0 ? (
                        <span className="text-destructive">{formatRupiah(r.tunggakanTotal)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.isIsolated && (
                        <Badge variant="destructive" className="ml-1">
                          Isolir
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {isAdminOwner && r.canCatatNunggak && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/isp/tagihan/${r.pelangganId}`}>Nunggak</Link>
                          </Button>
                        )}
                        {canPay ? (
                          <Button asChild size="sm">
                            <Link href={`/isp/tagihan/${r.pelangganId}`}>Bayar</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/isp/tagihan/${r.pelangganId}`}>Detail</Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Tidak ada data tagihan untuk filter ini.
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
