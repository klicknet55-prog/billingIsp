"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Router } from "@/lib/db/schema";
import { createOdpAction, deleteOdpAction, updateOdpAction } from "../actions";
import type { OdpRow } from "../service";
import { OdpFields } from "./odp-fields";

export function OdpPanel({
  rows,
  routers,
}: {
  rows: OdpRow[];
  routers: Router[];
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const editing = rows.find((r) => r.id === editId);

  const routerOptions = routers.map((r) => ({ id: r.id, nama: r.nama }));
  const odpOptions = rows.map((r) => ({ id: r.id, kode: r.kode, nama: r.nama }));

  return (
    <div className="space-y-4">
      <Disclosure label="Tambah ODP">
        <form action={createOdpAction} className="space-y-4">
          <OdpFields routerOptions={routerOptions} odpOptions={odpOptions} />
          <Button type="submit">Simpan ODP</Button>
        </form>
      </Disclosure>

      {editing && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <h3 className="font-medium">Edit ODP: {editing.kode}</h3>
            <form action={updateOdpAction} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <OdpFields
                defaults={editing}
                routerOptions={routerOptions}
                odpOptions={odpOptions}
              />
              <div className="flex gap-2">
                <Button type="submit">Simpan Perubahan</Button>
                <Button type="button" variant="outline" onClick={() => setEditId(null)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID ODP</TableHead>
                <TableHead>Input dari</TableHead>
                <TableHead>Splitter</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.kode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.inputFromLabel ?? "-"}
                  </TableCell>
                  <TableCell>{r.splitterPasif ?? "-"}</TableCell>
                  <TableCell>
                    {r.portTerpakai}/{r.kapasitasPort}
                    {r.childOdpCount > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        · {r.childOdpCount} cabang
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{r.isActive ? "Aktif" : "Nonaktif"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => setEditId(r.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <form action={deleteOdpAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          title="Hapus"
                          disabled={r.portTerpakai > 0 || r.childOdpCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada ODP. Tambah ODP untuk menampilkan titik di peta.
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
