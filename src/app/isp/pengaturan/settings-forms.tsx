"use client";

import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import {
  saveAdminProfileAction,
  saveBillingSettingsAction,
  saveCompanyProfileAction,
} from "@/features/settings/actions";

const initial: ActionState = {};

export function AdminProfileForm({
  defaults,
}: {
  defaults: { nama: string; email: string; phone: string | null };
}) {
  const [state, action] = useActionState(saveAdminProfileAction, initial);
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: "Profil admin tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Nama</label>
        <input
          name="nama"
          defaultValue={defaults.nama}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {fe.nama && <p className="text-xs text-destructive">{fe.nama}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          name="email"
          defaultValue={defaults.email}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {fe.email && <p className="text-xs text-destructive">{fe.email}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">No. HP</label>
        <input
          name="phone"
          defaultValue={defaults.phone ?? ""}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Password baru (opsional)</label>
        <input
          type="password"
          name="password"
          placeholder="Kosongkan jika tidak diubah"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {fe.password && <p className="text-xs text-destructive">{fe.password}</p>}
      </div>
      <SubmitButton>Simpan Profil Admin</SubmitButton>
    </form>
  );
}

export function CompanyProfileForm({
  defaults,
}: {
  defaults: {
    namaUsaha: string;
    alamat: string | null;
    phone: string | null;
    logoUrl: string | null;
  };
}) {
  const [state, action] = useActionState(saveCompanyProfileAction, initial);
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: "Profil perusahaan tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Nama Usaha</label>
        <input
          name="namaUsaha"
          defaultValue={defaults.namaUsaha}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
        {fe.namaUsaha && <p className="text-xs text-destructive">{fe.namaUsaha}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Alamat lengkap</label>
        <input
          name="alamat"
          defaultValue={defaults.alamat ?? ""}
          placeholder="Jl. Contoh No. 1"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">No. HP</label>
        <input
          name="phone"
          defaultValue={defaults.phone ?? ""}
          placeholder="0812xxxxxxx"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Upload Logo</label>
        <input
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="block w-full rounded-md border p-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Saran ukuran: <span className="font-medium">512x512 px</span> (rasio 1:1), format
          PNG/JPG/WEBP/SVG, maksimal 2MB.
        </p>
      </div>
      {defaults.logoUrl && (
        <div className="space-y-2">
          <img
            src={defaults.logoUrl}
            alt={defaults.namaUsaha}
            className="h-14 w-14 rounded border object-cover"
          />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="removeLogo" className="size-4" />
            Hapus logo saat ini
          </label>
        </div>
      )}
      <SubmitButton>Simpan Profil Perusahaan</SubmitButton>
    </form>
  );
}

export function BillingSettingsForm({
  defaults,
}: {
  defaults: {
    billingReminderDays: number;
    billingFirstInvoiceDays: number;
    billingGenerateDays: number;
    billingIsolationDays: number;
    billingDunningStep2Days: number;
  };
}) {
  const [state, action] = useActionState(saveBillingSettingsAction, initial);
  const { toast } = useToast();
  useEffect(() => {
    if (state.ok) toast({ title: "Pengaturan penagihan tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);
  const fe = state.fieldErrors ?? {};
  const fields = [
    {
      name: "billingReminderDays",
      label: "Reminder WhatsApp sebelum jatuh tempo",
      description: "Jumlah hari sebelum jatuh tempo (H-N).",
    },
    {
      name: "billingFirstInvoiceDays",
      label: "Tagihan pertama setelah pendaftaran",
      description: "Jeda hari setelah tanggal pendaftaran pelanggan (D+N).",
    },
    {
      name: "billingGenerateDays",
      label: "Generate tagihan recurring",
      description: "Jumlah hari sebelum jatuh tempo untuk mulai membuat tagihan (H-N).",
    },
    {
      name: "billingIsolationDays",
      label: "Grace period sebelum isolir",
      description: "Jumlah hari setelah jatuh tempo sebelum pelanggan diisolir (H+N).",
    },
    {
      name: "billingDunningStep2Days",
      label: "Dunning step 2",
      description: "Jumlah hari setelah jatuh tempo untuk pengingat WhatsApp kedua (H+N).",
    },
  ] as const;

  return (
    <form action={action} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="mb-1 block text-sm font-medium">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type="number"
            min={0}
            max={365}
            step={1}
            required
            defaultValue={defaults[field.name]}
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">{field.description} Rentang 0–365 hari.</p>
          {fe[field.name] && <p className="text-xs text-destructive">{fe[field.name]}</p>}
        </div>
      ))}
      <SubmitButton>Simpan Pengaturan Penagihan</SubmitButton>
    </form>
  );
}
