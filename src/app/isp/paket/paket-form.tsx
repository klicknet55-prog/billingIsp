"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createPaketAction, fetchMikrotikProfilesAction } from "@/features/packages/actions";

interface RouterOption {
  id: string;
  nama: string;
  tipe: "pppoe" | "hotspot";
}

export function PaketForm({ routers }: { routers: RouterOption[] }) {
  const [routerId, setRouterId] = useState("");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedRouter = routers.find((r) => r.id === routerId);
  const routerTipe = selectedRouter?.tipe;

  const loadProfiles = useCallback((id: string, tipe: "pppoe" | "hotspot") => {
    startTransition(async () => {
      setProfileError(null);
      setProfiles([]);
      const result = await fetchMikrotikProfilesAction(id, tipe);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      setProfiles(result.profiles ?? []);
    });
  }, []);

  useEffect(() => {
    if (!routerId || !routerTipe) {
      setProfiles([]);
      setProfileError(null);
      return;
    }
    loadProfiles(routerId, routerTipe);
  }, [routerId, routerTipe, loadProfiles]);

  return (
    <form action={createPaketAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="nama">Nama</Label>
        <Input id="nama" name="nama" required placeholder="Home 10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kecepatan">Kecepatan</Label>
        <Input id="kecepatan" name="kecepatan" required placeholder="10 Mbps" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hargaBulanan">Harga / bln</Label>
        <Input id="hargaBulanan" name="hargaBulanan" type="number" required placeholder="150000" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="routerId">Router Mikrotik</Label>
        <Select
          id="routerId"
          name="routerId"
          value={routerId}
          onChange={(e) => setRouterId(e.target.value)}
        >
          <option value="">— Pilih router —</option>
          {routers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama} ({r.tipe.toUpperCase()})
            </option>
          ))}
        </Select>
        {routers.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada router. Tambah di menu Router.</p>
        )}
      </div>

      {routerTipe === "pppoe" && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mikrotikProfilePppoe">Profile PPPoE Mikrotik</Label>
          <Select
            id="mikrotikProfilePppoe"
            name="mikrotikProfilePppoe"
            disabled={!routerId || pending}
            required={!!routerId}
          >
            <option value="">
              {pending ? "Memuat profile…" : "— Pilih profile —"}
            </option>
            {profiles.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          {profileError && <p className="text-xs text-destructive">{profileError}</p>}
        </div>
      )}

      {routerTipe === "hotspot" && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mikrotikProfileHotspot">Profile Hotspot Mikrotik</Label>
          <Select
            id="mikrotikProfileHotspot"
            name="mikrotikProfileHotspot"
            disabled={!routerId || pending}
            required={!!routerId}
          >
            <option value="">
              {pending ? "Memuat profile…" : "— Pilih profile —"}
            </option>
            {profiles.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          {profileError && <p className="text-xs text-destructive">{profileError}</p>}
        </div>
      )}

      <div className="sm:col-span-2">
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}
