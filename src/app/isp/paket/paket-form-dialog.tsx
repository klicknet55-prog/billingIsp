"use client";

import { Plus } from "lucide-react";
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
import { PaketForm } from "./paket-form";

interface RouterOption {
  id: string;
  nama: string;
}

interface PaketRow {
  id: string;
  nama: string;
  kecepatan: string;
  tipe: "pppoe" | "hotspot";
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
    paket.tipe === "hotspot"
      ? (paket.mikrotikProfileHotspot ?? "")
      : (paket.mikrotikProfilePppoe ?? "");
  const [routerId, setRouterId] = useState(paket.routerId ?? "");
  const [tipe, setTipe] = useState<"pppoe" | "hotspot">(paket.tipe);
  const [profile, setProfile] = useState(initialProfile);
  const [profiles, setProfiles] = useState<string[]>(initialProfile ? [initialProfile] : []);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState(updatePaketAction, initial);
  const { toast } = useToast();

  const profileOptions = useMemo(() => {
    const names = new Set(profiles);
    if (profile.trim()) names.add(profile.trim());
    return [...names].sort();
  }, [profiles, profile]);

  const loadProfiles = useCallback((id: string, connectionTipe: "pppoe" | "hotspot") => {
    startTransition(async () => {
      setProfileError(null);
      const result = await fetchMikrotikProfilesAction(id, connectionTipe);
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
    if (!routerId) {
      setProfiles([]);
      setProfileError(null);
      return;
    }
    loadProfiles(routerId, tipe);
  }, [routerId, tipe, loadProfiles]);

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
        <Label htmlFor={`tipe-${paket.id}`}>Tipe Layanan</Label>
        <Select
          id={`tipe-${paket.id}`}
          name="tipe"
          value={tipe}
          onChange={(e) => {
            setTipe(e.target.value === "hotspot" ? "hotspot" : "pppoe");
            setProfile("");
          }}
        >
          <option value="pppoe">PPPoE</option>
          <option value="hotspot">Hotspot</option>
        </Select>
      </div>
      <div className="space-y-2 sm:col-span-2">
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
              {r.nama}
            </option>
          ))}
        </Select>
      </div>

      {tipe === "pppoe" && (
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

      {tipe === "hotspot" && (
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

export function PaketCreateDialog({ routers }: { routers: RouterOption[] }) {
  return (
    <Dialog
      trigger={
        <Button size="sm">
          <Plus />
          Tambah Paket
        </Button>
      }
      title="Tambah Paket"
      description="Buat paket layanan baru dan mapping profile PPPoE/Hotspot ke Mikrotik."
      className="max-w-2xl"
    >
      {(close) => <PaketForm routers={routers} onCancel={close} />}
    </Dialog>
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
