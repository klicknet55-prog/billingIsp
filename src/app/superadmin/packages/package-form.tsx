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
import {
  SAAS_FEATURE_CATALOG,
  SAAS_INTEGRATION_COMING_SOON,
  SAAS_INTEGRATION_FEATURE_KEYS,
  SAAS_MODULE_FEATURE_KEYS,
} from "@/features/tenants/saas-features";

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

function FeatureCheckboxes({
  keys,
  selected,
  namePrefix,
}: {
  keys: readonly string[];
  selected: string[];
  namePrefix: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {keys.map((key) => {
        const info = SAAS_FEATURE_CATALOG[key as keyof typeof SAAS_FEATURE_CATALOG];
        const comingSoon = SAAS_INTEGRATION_COMING_SOON.includes(
          key as (typeof SAAS_INTEGRATION_COMING_SOON)[number]
        );
        return (
          <label
            key={key}
            className={`flex items-start gap-2 rounded-md border p-3 text-sm ${comingSoon ? "opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              name={`${namePrefix}_${key}`}
              value="on"
              defaultChecked={selected.includes(key)}
              disabled={comingSoon}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="font-medium">{info?.label ?? key}</span>
              {comingSoon && (
                <span className="ml-1 text-xs text-muted-foreground">(fase berikutnya)</span>
              )}
              <span className="mt-0.5 block text-xs text-muted-foreground">{info?.description}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function FormBody({ pkg, close }: { pkg?: Pkg; close: () => void }) {
  const [state, action] = useActionState(saveSaasPackageAction, initial);
  const { toast } = useToast();
  const selected = pkg?.limitasi.fitur ?? [];

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

      <div className="space-y-2">
        <Label>Integrasi (aktif/nonaktif per paket)</Label>
        <FeatureCheckboxes keys={SAAS_INTEGRATION_FEATURE_KEYS} selected={selected} namePrefix="fitur" />
      </div>

      <div className="space-y-2">
        <Label>Modul aplikasi</Label>
        <FeatureCheckboxes keys={SAAS_MODULE_FEATURE_KEYS} selected={selected} namePrefix="fitur" />
      </div>

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
