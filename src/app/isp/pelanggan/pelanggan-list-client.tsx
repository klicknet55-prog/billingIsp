"use client";

import { MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MobileDataCard } from "@/components/layout/mobile-data-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleIsolasiAction } from "@/features/customers/actions";
import { PelangganDeleteDialog } from "@/features/customers/components/pelanggan-delete-dialog";

type PelangganListRow = {
  id: string;
  nama: string;
  noWa: string;
  paketNama: string | null;
  connectionType: string;
  connectionUsername: string | null;
  isIsolated: boolean;
  navUrl: string | null;
};

function filterRows(rows: PelangganListRow[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((p) => {
    return (
      p.nama.toLowerCase().includes(q) ||
      p.noWa.toLowerCase().includes(q) ||
      (p.paketNama ?? "").toLowerCase().includes(q) ||
      (p.connectionUsername ?? "").toLowerCase().includes(q) ||
      p.connectionType.toLowerCase().includes(q)
    );
  });
}

export function PelangganListClient({ rows }: { rows: PelangganListRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterRows(rows, query), [rows, query]);

  return (
    <div className="space-y-3">
      <Input
        type="search"
        placeholder="Cari pelanggan, WhatsApp, paket, username..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 md:h-9"
      />

      <div className="space-y-3 md:hidden">
        {filtered.map((p) => (
          <MobileDataCard
            key={p.id}
            title={p.nama}
            badge={p.isIsolated ? "Isolir" : "Aktif"}
            badgeVariant={p.isIsolated ? "destructive" : "success"}
            meta={
              <>
                <p>{p.noWa}</p>
                <p>
                  {p.paketNama ?? "-"} · {p.connectionType}
                </p>
              </>
            }
            footer={
              <div className="flex items-center gap-2">
                {p.navUrl && (
                  <Button asChild size="sm" variant="outline">
                    <a href={p.navUrl} target="_blank" rel="noreferrer">
                      <MapPin className="mr-1 h-4 w-4" />
                      Maps
                    </a>
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/pelanggan/${p.id}`}>Lihat detail</Link>
                </Button>
              </div>
            }
          />
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tidak ada pelanggan yang cocok.
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="hidden md:table-cell">Username</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{p.noWa}</TableCell>
                  <TableCell className="uppercase">{p.connectionType}</TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {p.connectionUsername ?? "-"}
                  </TableCell>
                  <TableCell>{p.paketNama ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={p.isIsolated ? "destructive" : "success"}>
                      {p.isIsolated ? "Terisolir" : "Aktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {p.navUrl && (
                        <Button asChild variant="ghost" size="icon" title="Navigasi">
                          <a href={p.navUrl} target="_blank" rel="noreferrer">
                            <MapPin />
                          </a>
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="icon" title="Edit">
                        <Link href={`/dashboard/pelanggan/${p.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <form action={toggleIsolasiAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="isolated" value={String(!p.isIsolated)} />
                        <Button variant="outline" size="sm" type="submit">
                          {p.isIsolated ? "Aktifkan" : "Isolir"}
                        </Button>
                      </form>
                      <PelangganDeleteDialog pelangganId={p.id} pelangganNama={p.nama} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Tidak ada pelanggan yang cocok.
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
