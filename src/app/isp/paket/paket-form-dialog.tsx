"use client";

import { useActionState, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { fetchMikrotikProfilesAction, updatePaketAction } from "@/features/packages/actions";

interface RouterOption {
  id: string;
  nama: string;
  tipe: "pppoe" | "hotspot";
}

interface PaketRow {
  id: string;
  nama: string;
  kecepatan: string;
  routerId: string | null;
  mikrotikProfilePppoe: string | null;
  mikrotikProfileHotspot: string | null;
  hargaBulanan: number;
}

const initial: ActionState = {};

function FormBody({
  paket,
  routers,
  close,
}: {
  paket: PaketRow;
  routers: RouterOption[];
  close: () => void;
}) {
  const initialProfile =
    paket.mikrotikProfilePppoe ?? paket.mikrotikProfileHotspot ?? "";
  const [routerId, setRouterId] = useState(paket.routerId ?? "");
  const [profile, setProfile] = useState(initialProfile);
  const [profiles, setProfiles] = useState<string[]>(initialProfile ? [initialProfile] : []);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState(updatePaketAction, initial);
  const { toast } = useToast();

  const selectedRouter = routers.find((r) => r.id === routerId);
  const routerTipe = selectedRouter?.tipe;

  const profileOptions = useMemo(() => {
    const names = new Set(profiles);
    if (profile.trim()) names.add(profile.trim());
    return [...names].sort();
  }, [profiles, profile]);

  const loadProfiles = useCallback((id: string, tipe: "pppoe" | "hotspot") => {
    startTransition(async () => {
      setProfileError(null);
      const result = await fetchMikrotikProfilesAction(id, tipe);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      setProfiles(result.profiles ?? []);
    });
  }, []);

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Paket diperbarui", variant: "success" });
      close();
    }
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast, close]);

  useEffect(() => {
    if (!routerId || !routerTipe) {
      setProfiles([]);
      setProfileError(null);
      return;
    }
    loadProfiles(routerId, routerTipe);
  }, [routerId, routerTipe, loadProfiles]);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={paket.id} />
      <div className="space-y-2">
        <Label htmlFor={`nama-${paket.id}`}>Nama</Label>
        <Input id={`nama-${paket.id}`} name="nama" defaultValue={paket.nama} required />
        {fe.nama && <p className="text-xs text-destructive">{fe.nama}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`kecepatan-${paket.id}`}>Kecepatan</Label>
        <Input
          id={`kecepatan-${paket.id}`}
          name="kecepatan"
          defaultValue={paket.kecepatan}
          required
        />
        {fe.kecepatan && <p className="text-xs text-destructive">{fe.kecepatan}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`hargaBulanan-${paket.id}`}>Harga / bln</Label>
        <Input
          id={`hargaBulanan-${paket.id}`}
          name="hargaBulanan"
          type="number"
          defaultValue={paket.hargaBulanan}
          required
        />
        {fe.hargaBulanan && <p className="text-xs text-destructive">{fe.hargaBulanan}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`routerId-${paket.id}`}>Router Mikrotik</Label>
        <Select
          id={`routerId-${paket.id}`}
          name="routerId"
          value={routerId}
          onChange={(e) => {
            setRouterId(e.target.value);
            setProfile("");
          }}
        >
          <option value="">— Pilih router —</option>
          {routers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama} ({r.tipe.toUpperCase()})
            </option>
          ))}
        </Select>
      </div>

      {routerTipe === "pppoe" && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`mikrotikProfilePppoe-${paket.id}`}>Profile PPPoE Mikrotik</Label>
          <Select
            id={`mikrotikProfilePppoe-${paket.id}`}
            name="mikrotikProfilePppoe"
            value={profile}
            disabled={!routerId || pending}
            required={!!routerId}
            onChange={(e) => setProfile(e.target.value)}
          >
            <option value="">{pending ? "Memuat profile…" : "— Pilih profile —"}</option>
            {profileOptions.map((name) => (
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
          <Label htmlFor={`mikrotikProfileHotspot-${paket.id}`}>Profile Hotspot Mikrotik</Label>
          <Select
            id={`mikrotikProfileHotspot-${paket.id}`}
            name="mikrotikProfileHotspot"
            value={profile}
            disabled={!routerId || pending}
            required={!!routerId}
            onChange={(e) => setProfile(e.target.value)}
          >
            <option value="">{pending ? "Memuat profile…" : "— Pilih profile —"}</option>
            {profileOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          {profileError && <p className="text-xs text-destructive">{profileError}</p>}
        </div>
      )}

      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={close}>
          Batal
        </Button>
        <SubmitButton>Simpan</SubmitButton>
      </div>
    </form>
  );
}

export function PaketFormDialog({
  paket,
  routers,
  trigger,
}: {
  paket: PaketRow;
  routers: RouterOption[];
  trigger: React.ReactNode;
}) {
  return (
    <Dialog
      trigger={trigger}
      title="Edit Paket"
      description="Perbarui detail paket dan mapping profile Mikrotik."
      className="max-w-2xl"
    >
      {(close) => <FormBody paket={paket} routers={routers} close={close} />}
    </Dialog>
  );
}
