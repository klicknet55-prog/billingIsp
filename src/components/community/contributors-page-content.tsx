"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommunityContributorRow } from "@/features/community-donation/service";
import { formatDate, formatRupiah } from "@/lib/utils";

const roleLabel: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  kolektor: "Kolektor",
  teknisi: "Teknisi",
};

function matchesQuery(row: CommunityContributorRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const role = roleLabel[row.donorRole] ?? row.donorRole;
  return (
    row.namaUsaha.toLowerCase().includes(q) ||
    row.domain.toLowerCase().includes(q) ||
    row.donorNama.toLowerCase().includes(q) ||
    row.donorRole.toLowerCase().includes(q) ||
    role.toLowerCase().includes(q) ||
    String(row.amount).includes(q)
  );
}

export function ContributorsPageContent({
  contributors,
  successMessage,
}: {
  contributors: CommunityContributorRow[];
  successMessage?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => contributors.filter((row) => matchesQuery(row, query)),
    [contributors, query]
  );

  return (
    <div className="space-y-4">
      {successMessage && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          Terima kasih! Donasi Anda telah berhasil dan tercatat di daftar kontributor.
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Jumlah kontributor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{contributors.length}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar kontributor</CardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama usaha, domain, donatur..."
              className="pl-8"
              aria-label="Cari kontributor"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pt-0">
          {query.trim() && (
            <p className="px-6 text-xs text-muted-foreground">
              Menampilkan {filtered.length} dari {contributors.length} kontributor
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama usaha</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Donatur</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.namaUsaha}</TableCell>
                  <TableCell>{row.domain}</TableCell>
                  <TableCell>{row.donorNama}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabel[row.donorRole] ?? row.donorRole}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatRupiah(row.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(row.paidAt)}</TableCell>
                </TableRow>
              ))}
              {contributors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada kontributor. Jadilah yang pertama melalui halaman Community.
                  </TableCell>
                </TableRow>
              )}
              {contributors.length > 0 && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada kontributor yang cocok dengan pencarian &quot;{query.trim()}&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
