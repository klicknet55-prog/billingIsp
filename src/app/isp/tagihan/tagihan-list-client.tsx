"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MobileDataCard } from "@/components/layout/mobile-data-card";
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
import { formatTagihanPeriode } from "@/features/billing/format-periode";
import type {
  TagihanPelangganRow,
  TagihanPelangganStatus,
} from "@/features/billing/tagihan-types";
import { formatDate, formatRupiah } from "@/lib/utils";
import { QueryTabNav } from "@/components/ui/query-tab-nav";

const FILTERS = [
  { id: "belum-lunas", label: "Belum lunas" },
  { id: "tunggakan", label: "Tunggakan" },
  { id: "semua", label: "Semua" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

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

function filterRows(rows: TagihanPelangganRow[], filter: FilterId) {
  if (filter === "semua") return rows;
  if (filter === "tunggakan") {
    return rows.filter((r) => r.status === "tunggakan" || r.tunggakanCount > 0);
  }
  return rows.filter(
    (r) => r.status === "open" || r.status === "tunggakan" || r.isIsolated
  );
}

export function TagihanListClient({
  initialFilter,
  rows,
  isAdminOwner,
}: {
  initialFilter: string;
  rows: TagihanPelangganRow[];
  isAdminOwner: boolean;
}) {
  const validFilter = FILTERS.some((f) => f.id === initialFilter)
    ? (initialFilter as FilterId)
    : "belum-lunas";
  const [filter, setFilter] = useState<FilterId>(validFilter);

  const filtered = useMemo(() => filterRows(rows, filter), [rows, filter]);

  return (
    <>
      <QueryTabNav
        tabs={FILTERS}
        active={filter}
        basePath="/dashboard/tagihan"
        paramKey="filter"
        defaultTabId="belum-lunas"
        mode="client"
        onTabChange={(id) => setFilter(id as FilterId)}
        className="mb-4 border-b-0 pb-0"
      />

      <div className="space-y-3 md:hidden">
        {filtered.map((r) => {
          const canPay = r.status === "open" || r.status === "tunggakan";
          return (
            <MobileDataCard
              key={r.pelangganId}
              title={r.nama}
              badge={STATUS_LABEL[r.status]}
              badgeVariant={STATUS_VARIANT[r.status]}
              meta={
                <>
                  <p>{r.paketNama ?? "-"}</p>
                  <p>Jatuh tempo: {formatDate(r.activeDueDate)}</p>
                  {r.tunggakanCount > 0 && (
                    <p className="text-destructive">
                      Tunggakan: {formatRupiah(r.tunggakanTotal)}
                    </p>
                  )}
                </>
              }
              footer={
                canPay ? (
                  <Button asChild size="sm">
                    <Link href={`/dashboard/tagihan/${r.pelangganId}`}>Bayar</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/tagihan/${r.pelangganId}`}>Detail</Link>
                  </Button>
                )
              }
            />
          );
        })}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tidak ada data tagihan untuk filter ini.
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="hidden md:block">
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
                            <Link href={`/dashboard/tagihan/${r.pelangganId}`}>Nunggak</Link>
                          </Button>
                        )}
                        {canPay ? (
                          <Button asChild size="sm">
                            <Link href={`/dashboard/tagihan/${r.pelangganId}`}>Bayar</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/dashboard/tagihan/${r.pelangganId}`}>Detail</Link>
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
