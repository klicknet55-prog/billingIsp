"use client";

import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import {
  saveAlamatAction,
  saveLogoBrandAction,
  savePemilikAction,
  saveProfilAppAction,
  saveReferralSettingsAction,
  saveTelegramAction,
} from "@/features/platform-settings/actions";
import type { PlatformSettings } from "@/lib/db/schema";

const initial: ActionState = {};

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ProfilAppForm({
  defaults,
}: {
  defaults: Pick<PlatformSettings, "brandName" | "brandTagline">;
}) {
  const [state, action] = useActionState(saveProfilAppAction, initial);
  const { toast } = useToast();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) toast({ title: "Profil app tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field id="brandName" label="Nama aplikasi / brand" error={fe.brandName}>
        <input
          id="brandName"
          name="brandName"
          defaultValue={defaults.brandName}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </Field>
      <Field
        id="brandTagline"
        label="Tagline / deskripsi singkat"
        hint="Dipakai di homepage dan metadata browser."
        error={fe.brandTagline}
      >
        <Textarea
          id="brandTagline"
          name="brandTagline"
          defaultValue={defaults.brandTagline ?? ""}
          rows={3}
          className="text-sm"
        />
      </Field>
      <SubmitButton>Simpan Profil App</SubmitButton>
    </form>
  );
}

export function LogoBrandForm({
  defaults,
}: {
  defaults: Pick<PlatformSettings, "logoUrl" | "brandName">;
}) {
  const [state, action] = useActionState(saveLogoBrandAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) toast({ title: "Logo brand tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field id="logoFile" label="Upload logo">
        <input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="block w-full rounded-md border p-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Saran: 512×512 px, PNG/JPG/WEBP/SVG, maks. 2MB.
        </p>
      </Field>
      {defaults.logoUrl && (
        <div className="space-y-2">
          <img
            src={defaults.logoUrl}
            alt={defaults.brandName}
            className="h-16 w-16 rounded border object-cover"
          />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="removeLogo" className="size-4" />
            Hapus logo saat ini
          </label>
        </div>
      )}
      <SubmitButton>Simpan Logo</SubmitButton>
    </form>
  );
}

export function PemilikForm({
  defaults,
}: {
  defaults: Pick<PlatformSettings, "ownerName" | "ownerPhone" | "ownerEmail">;
}) {
  const [state, action] = useActionState(savePemilikAction, initial);
  const { toast } = useToast();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) toast({ title: "Data pemilik tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field id="ownerName" label="Nama pemilik / perusahaan" error={fe.ownerName}>
        <input
          id="ownerName"
          name="ownerName"
          defaultValue={defaults.ownerName ?? ""}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </Field>
      <Field id="ownerPhone" label="No. telepon / WhatsApp" error={fe.ownerPhone}>
        <input
          id="ownerPhone"
          name="ownerPhone"
          defaultValue={defaults.ownerPhone ?? ""}
          placeholder="6281234567890"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </Field>
      <Field id="ownerEmail" label="Email" error={fe.ownerEmail}>
        <input
          id="ownerEmail"
          name="ownerEmail"
          type="email"
          defaultValue={defaults.ownerEmail ?? ""}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </Field>
      <SubmitButton>Simpan Data Pemilik</SubmitButton>
    </form>
  );
}

export function AlamatForm({
  defaults,
}: {
  defaults: Pick<PlatformSettings, "address">;
}) {
  const [state, action] = useActionState(saveAlamatAction, initial);
  const { toast } = useToast();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) toast({ title: "Alamat tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field id="address" label="Alamat lengkap" error={fe.address}>
        <Textarea
          id="address"
          name="address"
          defaultValue={defaults.address ?? ""}
          rows={5}
          placeholder="Jl. Contoh No. 1, Kota, Provinsi"
          className="text-sm"
        />
      </Field>
      <SubmitButton>Simpan Alamat</SubmitButton>
    </form>
  );
}

export function TelegramForm({
  defaults,
}: {
  defaults: Pick<PlatformSettings, "telegramGroupUrl">;
}) {
  const [state, action] = useActionState(saveTelegramAction, initial);
  const { toast } = useToast();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) toast({ title: "Link Telegram tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-4">
      <Field
        id="telegramGroupUrl"
        label="Link grup Telegram"
        hint="Contoh: https://t.me/nama_grup atau link invite t.me/+xxxxx"
        error={fe.telegramGroupUrl}
      >
        <input
          id="telegramGroupUrl"
          name="telegramGroupUrl"
          type="url"
          defaultValue={defaults.telegramGroupUrl ?? ""}
          placeholder="https://t.me/grup_anda"
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </Field>
      <SubmitButton>Simpan Link Telegram</SubmitButton>
    </form>
  );
}

export function ReferralForm({
  defaults,
}: {
  defaults: Pick<
    PlatformSettings,
    "referralEnabled" | "referralRewardDays" | "referralMaxPerTenant"
  >;
}) {
  const [state, action] = useActionState(saveReferralSettingsAction, initial);
  const { toast } = useToast();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) toast({ title: "Pengaturan referral tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
        <input
          type="checkbox"
          name="referralEnabled"
          value="on"
          defaultChecked={defaults.referralEnabled ?? false}
          className="mt-0.5 size-4 shrink-0 rounded border-input"
        />
        <span>
          <span className="font-medium">Aktifkan program referral</span>
          <span className="mt-1 block text-muted-foreground">
            Tenant pengundang mendapat perpanjangan langganan saat ISP baru mendaftar dengan kode
            mereka.
          </span>
        </span>
      </label>
      <Field
        id="referralRewardDays"
        label="Bonus hari per referral sukses"
        error={fe.referralRewardDays}
      >
        <input
          id="referralRewardDays"
          name="referralRewardDays"
          type="number"
          min={1}
          max={365}
          defaultValue={defaults.referralRewardDays ?? 7}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </Field>
      <Field
        id="referralMaxPerTenant"
        label="Maksimum referral sukses per tenant"
        hint="Batas jumlah ISP baru yang dapat memberi bonus kepada satu pengundang."
        error={fe.referralMaxPerTenant}
      >
        <input
          id="referralMaxPerTenant"
          name="referralMaxPerTenant"
          type="number"
          min={1}
          max={1000}
          defaultValue={defaults.referralMaxPerTenant ?? 10}
          className="h-9 w-full rounded-md border px-3 text-sm"
        />
      </Field>
      <SubmitButton>Simpan Pengaturan Referral</SubmitButton>
    </form>
  );
}
