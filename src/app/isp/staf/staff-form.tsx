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
import { saveStaffAction } from "@/features/staff/actions";

interface Staff {
  id: string;
  nama: string;
  email: string;
  role: string;
  phone: string | null;
}

const initial: ActionState = {};

function FormBody({ staff, close }: { staff?: Staff; close: () => void }) {
  const [state, action] = useActionState(saveStaffAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Staf disimpan", variant: "success" });
      close();
    }
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast, close]);

  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {staff && <input type="hidden" name="id" value={staff.id} />}
      <div className="space-y-2">
        <Label htmlFor="nama">Nama</Label>
        <Input id="nama" name="nama" defaultValue={staff?.nama} />
        {fe.nama && <p className="text-xs text-destructive">{fe.nama}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={staff?.email}
          readOnly={!!staff}
          className={staff ? "opacity-60" : ""}
        />
        {fe.email && <p className="text-xs text-destructive">{fe.email}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Peran</Label>
          <Select id="role" name="role" defaultValue={staff?.role ?? "admin"}>
            <option value="admin">Admin</option>
            <option value="kolektor">Kolektor</option>
            <option value="teknisi">Teknisi</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">No. HP</Label>
          <Input id="phone" name="phone" defaultValue={staff?.phone ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{staff ? "Kata sandi baru (opsional)" : "Kata sandi"}</Label>
        <Input id="password" name="password" type="password" placeholder="Minimal 6 karakter" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={close}>
          Batal
        </Button>
        <SubmitButton>Simpan</SubmitButton>
      </div>
    </form>
  );
}

export function StaffFormDialog({ staff, trigger }: { staff?: Staff; trigger: React.ReactNode }) {
  return (
    <Dialog trigger={trigger} title={staff ? "Edit Staf" : "Tambah Staf"}>
      {(close) => <FormBody staff={staff} close={close} />}
    </Dialog>
  );
}
