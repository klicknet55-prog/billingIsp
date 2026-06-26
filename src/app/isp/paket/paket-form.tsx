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
}

export function PaketForm({
  routers,
  onCancel,
}: {
  routers: RouterOption[];
  onCancel?: () => void;
}) {
  const [routerId, setRouterId] = useState("");
  const [tipe, setTipe] = useState<"pppoe" | "hotspot">("pppoe");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadProfiles = useCallback((id: string, connectionTipe: "pppoe" | "hotspot") => {
    startTransition(async () => {
      setProfileError(null);
      setProfiles([]);
      const result = await fetchMikrotikProfilesAction(id, connectionTipe);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      setProfiles(result.profiles ?? []);
    });
  }, []);

  useEffect(() => {
    if (!routerId) {
      setProfiles([]);
      setProfileError(null);
      return;
    }
    loadProfiles(routerId, tipe);
  }, [routerId, tipe, loadProfiles]);

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
        <Label htmlFor="tipe">Tipe Layanan</Label>
        <Select
          id="tipe"
          name="tipe"
          value={tipe}
          onChange={(e) => setTipe(e.target.value === "hotspot" ? "hotspot" : "pppoe")}
        >
          <option value="pppoe">PPPoE</option>
          <option value="hotspot">Hotspot</option>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
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
              {r.nama}
            </option>
          ))}
        </Select>
        {routers.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada router. Tambah di menu Router.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Satu router dapat dipakai untuk paket PPPoE dan Hotspot sekaligus.
        </p>
      </div>

      {tipe === "pppoe" && (
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

      {tipe === "hotspot" && (
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

      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}
