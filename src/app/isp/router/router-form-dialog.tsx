"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { updateRouterAction } from "@/features/routers/actions";

interface RouterRow {
  id: string;
  nama: string;
  connectionMode: "rest" | "legacy_api";
  ipAddress: string;
  apiPort: string;
  username: string;
  tipe: "pppoe" | "hotspot";
}

const initial: ActionState = {};

function FormBody({ router, close }: { router: RouterRow; close: () => void }) {
  const [state, action] = useActionState(updateRouterAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Router diperbarui", variant: "success" });
      close();
    }
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast, close]);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={router.id} />
      <div className="space-y-2">
        <Label htmlFor={`nama-${router.id}`}>Nama</Label>
        <Input id={`nama-${router.id}`} name="nama" defaultValue={router.nama} required />
        {fe.nama && <p className="text-xs text-destructive">{fe.nama}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`connectionMode-${router.id}`}>Mode Koneksi</Label>
        <Select
          id={`connectionMode-${router.id}`}
          name="connectionMode"
          defaultValue={router.connectionMode}
        >
          <option value="rest">REST API (RouterOS v7)</option>
          <option value="legacy_api">Legacy API (8728/8729)</option>
        </Select>
        {fe.connectionMode && <p className="text-xs text-destructive">{fe.connectionMode}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`ipAddress-${router.id}`}>IP Address</Label>
        <Input
          id={`ipAddress-${router.id}`}
          name="ipAddress"
          defaultValue={router.ipAddress}
          required
        />
        {fe.ipAddress && <p className="text-xs text-destructive">{fe.ipAddress}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`apiPort-${router.id}`}>Port API / HTTPS</Label>
        <Input id={`apiPort-${router.id}`} name="apiPort" defaultValue={router.apiPort} />
        {fe.apiPort && <p className="text-xs text-destructive">{fe.apiPort}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`tipe-${router.id}`}>Tipe</Label>
        <Select id={`tipe-${router.id}`} name="tipe" defaultValue={router.tipe}>
          <option value="pppoe">PPPoE</option>
          <option value="hotspot">Hotspot</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`username-${router.id}`}>Username</Label>
        <Input id={`username-${router.id}`} name="username" defaultValue={router.username} required />
        {fe.username && <p className="text-xs text-destructive">{fe.username}</p>}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`password-${router.id}`}>Password (kosongkan jika tidak diubah)</Label>
        <Input id={`password-${router.id}`} name="password" type="password" autoComplete="new-password" />
        {fe.password && <p className="text-xs text-destructive">{fe.password}</p>}
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={close}>
          Batal
        </Button>
        <SubmitButton>Simpan</SubmitButton>
      </div>
    </form>
  );
}

export function RouterFormDialog({
  router,
  trigger,
}: {
  router: RouterRow;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog trigger={trigger} title="Edit Router" description="Perbarui kredensial dan pengaturan koneksi Mikrotik.">
      {(close) => <FormBody router={router} close={close} />}
    </Dialog>
  );
}
