"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";
import { useState } from "react";
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
import { clearRouterLocationAction, updateRouterLocationAction } from "../map-actions";
import type { RouterMapRow } from "../service";

const MapPinPicker = dynamic(
  () => import("@/components/maps/map-pin-picker").then((m) => m.MapPinPicker),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse rounded-md bg-muted" /> }
);

function hasCoords(r: RouterMapRow) {
  return r.latitude != null && r.longitude != null;
}

export function RouterMapPanel({ rows }: { rows: RouterMapRow[] }) {
  const [editId, setEditId] = useState<string | null>(null);
  const editing = rows.find((r) => r.id === editId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tentukan titik lokasi server/router Mikrotik di peta. Pengaturan koneksi (IP, kredensial) tetap di{" "}
        <Link href="/dashboard/router" className="text-primary underline">
          menu Router
        </Link>
        .
      </p>

      {editing && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-medium">Lokasi: {editing.nama}</h3>
            <p className="text-xs text-muted-foreground">
              IP: {editing.ipAddress}:{editing.apiPort}
            </p>
            <form action={updateRouterLocationAction} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <MapPinPicker
                latitude={editing.latitude}
                longitude={editing.longitude}
                label="Titik server/router"
                height="280px"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Simpan lokasi</Button>
                <Button type="button" variant="outline" onClick={() => setEditId(null)}>
                  Batal
                </Button>
              </div>
            </form>
            {hasCoords(editing) && (
              <form action={clearRouterLocationAction}>
                <input type="hidden" name="id" value={editing.id} />
                <Button type="submit" variant="destructive" size="sm">
                  Hapus titik dari peta
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Lokasi peta</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.ipAddress}:{r.apiPort}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isOnline ? "success" : "secondary"}>
                      {r.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.pelangganCount}</TableCell>
                  <TableCell>
                    {hasCoords(r) ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {r.latitude!.toFixed(5)}, {r.longitude!.toFixed(5)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum di-set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Atur lokasi"
                        onClick={() => setEditId(r.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada router. Tambah router di menu Router terlebih dahulu.
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
