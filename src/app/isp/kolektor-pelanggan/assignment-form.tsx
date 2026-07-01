"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { saveKolektorAssignmentsAction } from "@/features/kolektor-assignments/actions";
import type {
  KolektorOption,
  PelangganAssignmentRow,
} from "@/features/kolektor-assignments/service";

const initial: ActionState = {};

export function KolektorAssignmentForm({
  kolektors,
  pelanggan,
}: {
  kolektors: KolektorOption[];
  pelanggan: PelangganAssignmentRow[];
}) {
  const [state, action] = useActionState(saveKolektorAssignmentsAction, initial);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterKolektor, setFilterKolektor] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(pelanggan.map((p) => [p.id, p.kolektorId ?? ""]))
  );

  useEffect(() => {
    if (state.ok) toast({ title: "Penugasan kolektor disimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pelanggan.filter((p) => {
      if (filterKolektor === "__unassigned__" && assignments[p.id]) return false;
      if (filterKolektor && filterKolektor !== "__unassigned__" && assignments[p.id] !== filterKolektor) {
        return false;
      }
      if (!q) return true;
      return (
        p.nama.toLowerCase().includes(q) ||
        p.noWa.includes(q) ||
        (p.alamat ?? "").toLowerCase().includes(q)
      );
    });
  }, [assignments, filterKolektor, pelanggan, search]);

  const summary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pelanggan) {
      const kid = assignments[p.id];
      if (!kid) continue;
      counts.set(kid, (counts.get(kid) ?? 0) + 1);
    }
    return kolektors.map((k) => ({ ...k, count: counts.get(k.id) ?? 0 }));
  }, [assignments, kolektors, pelanggan]);

  const unassignedCount = pelanggan.filter((p) => !assignments[p.id]).length;

  function setKolektor(pelangganId: string, kolektorId: string) {
    setAssignments((prev) => ({ ...prev, [pelangganId]: kolektorId }));
  }

  const payload = JSON.stringify(
    pelanggan.map((p) => ({
      pelangganId: p.id,
      kolektorId: assignments[p.id]?.trim() || null,
    }))
  );

  const kolektorSelect = (pelangganId: string) => (
    <Select
      value={assignments[pelangganId] ?? ""}
      onChange={(e) => setKolektor(pelangganId, e.target.value)}
      disabled={kolektors.length === 0}
      className="w-full min-w-0 max-w-full"
    >
      <option value="">— Belum ditugaskan —</option>
      {kolektors.map((k) => (
        <option key={k.id} value={k.id}>
          {k.nama}
        </option>
      ))}
    </Select>
  );

  return (
    <form action={action} className="space-y-4 min-w-0">
      <input type="hidden" name="assignments" value={payload} readOnly />

      <div className="flex flex-wrap gap-2">
        {summary.map((k) => (
          <Badge key={k.id} variant="secondary">
            {k.nama}: {k.count} pelanggan
          </Badge>
        ))}
        <Badge variant="outline">Belum ditugaskan: {unassignedCount}</Badge>
      </div>

      {kolektors.length === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Belum ada akun kolektor. Tambahkan di menu Staf terlebih dahulu.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 min-w-0">
          <Label htmlFor="search-pelanggan">Cari pelanggan</Label>
          <Input
            id="search-pelanggan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nama, WhatsApp, alamat..."
            className="w-full min-w-0"
          />
        </div>
        <div className="space-y-2 min-w-0">
          <Label htmlFor="filter-kolektor">Filter</Label>
          <Select
            id="filter-kolektor"
            value={filterKolektor}
            onChange={(e) => setFilterKolektor(e.target.value)}
            className="w-full min-w-0"
          >
            <option value="">Semua pelanggan</option>
            <option value="__unassigned__">Belum ditugaskan</option>
            {kolektors.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Mobile: card layout */}
      <div className="space-y-3 md:hidden">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-md border p-3 space-y-3 min-w-0">
            <div>
              <div className="font-medium">{p.nama}</div>
              {p.alamat && <div className="text-xs text-muted-foreground">{p.alamat}</div>}
              <div className="text-xs text-muted-foreground mt-0.5">{p.noWa}</div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Kolektor</Label>
              {kolektorSelect(p.id)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tidak ada pelanggan yang cocok dengan filter.
          </p>
        )}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Pelanggan</th>
              <th className="px-3 py-2 font-medium">WhatsApp</th>
              <th className="px-3 py-2 font-medium min-w-[12rem]">Kolektor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <div className="font-medium">{p.nama}</div>
                  {p.alamat && <div className="text-xs text-muted-foreground">{p.alamat}</div>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.noWa}</td>
                <td className="px-3 py-2 min-w-0">
                  {kolektorSelect(p.id)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                  Tidak ada pelanggan yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <SubmitButton disabled={kolektors.length === 0}>Simpan Penugasan</SubmitButton>
      </div>
    </form>
  );
}
