"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { saveSaasPackageAction } from "@/features/tenants/actions";

interface Pkg {
  id: string;
  nama: string;
  hargaBulanan: number;
  diskonTahunanPersen: number;
  limitasi: { maxPelanggan: number; maxRouter: number; fitur: string[] };
  isActive: boolean;
}

const initial: ActionState = {};

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FormBody({ pkg, close }: { pkg?: Pkg; close: () => void }) {
  const [state, action] = useActionState(saveSaasPackageAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Paket disimpan", variant: "success" });
      close();
    }
  }, [state.ok, toast, close]);

  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <Field id="nama" label="Nama paket" error={fe.nama}>
        <Input id="nama" name="nama" defaultValue={pkg?.nama} placeholder="Standard" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id="hargaBulanan" label="Harga / bln" error={fe.hargaBulanan}>
          <Input id="hargaBulanan" name="hargaBulanan" type="number" defaultValue={pkg?.hargaBulanan ?? 0} />
        </Field>
        <Field id="diskonTahunanPersen" label="Diskon tahunan (%)" error={fe.diskonTahunanPersen}>
          <Input
            id="diskonTahunanPersen"
            name="diskonTahunanPersen"
            type="number"
            min={0}
            max={100}
            defaultValue={pkg?.diskonTahunanPersen ?? 0}
          />
        </Field>
        <Field id="maxPelanggan" label="Max pelanggan" error={fe.maxPelanggan}>
          <Input id="maxPelanggan" name="maxPelanggan" type="number" defaultValue={pkg?.limitasi.maxPelanggan ?? 100} />
        </Field>
        <Field id="maxRouter" label="Max router" error={fe.maxRouter}>
          <Input id="maxRouter" name="maxRouter" type="number" defaultValue={pkg?.limitasi.maxRouter ?? 1} />
        </Field>
      </div>
      <Field id="fitur" label="Fitur (pisahkan dengan koma)" error={fe.fitur}>
        <Input
          id="fitur"
          name="fitur"
          defaultValue={pkg?.limitasi.fitur.join(", ")}
          placeholder="pelanggan, invoice, tiket, api_mikrotik"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={pkg?.isActive ?? true} className="size-4" />
        Aktif (tampil saat pendaftaran)
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={close}>
          Batal
        </Button>
        <SubmitButton>Simpan</SubmitButton>
      </div>
    </form>
  );
}

export function PackageFormDialog({ pkg, trigger }: { pkg?: Pkg; trigger: React.ReactNode }) {
  return (
    <Dialog trigger={trigger} title={pkg ? "Edit Paket SaaS" : "Tambah Paket SaaS"}>
      {(close) => <FormBody pkg={pkg} close={close} />}
    </Dialog>
  );
}
