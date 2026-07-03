"use client";

import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { saveSuperadminProfileAction } from "@/features/settings/actions";

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

const inputClass = "h-9 w-full rounded-md border px-3 text-sm";

export function SuperadminAccountForm({
  defaults,
}: {
  defaults: { nama: string; email: string; phone: string | null };
}) {
  const [state, action] = useActionState(saveSuperadminProfileAction, initial);
  const { toast } = useToast();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) toast({ title: "Akun superadmin tersimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Profil</h3>
        <Field id="nama" label="Nama" error={fe.nama}>
          <input id="nama" name="nama" defaultValue={defaults.nama} className={inputClass} required />
        </Field>
        <Field id="email" label="Email login" error={fe.email}>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults.email}
            className={inputClass}
            required
          />
        </Field>
        <Field id="phone" label="No. HP" error={fe.phone}>
          <input id="phone" name="phone" defaultValue={defaults.phone ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-4 border-t pt-6">
        <h3 className="text-sm font-medium">Ganti kata sandi</h3>
        <p className="text-xs text-muted-foreground">
          Kosongkan semua field kata sandi jika tidak ingin mengubah.
        </p>
        <Field id="currentPassword" label="Kata sandi saat ini" error={fe.currentPassword}>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            className={inputClass}
          />
        </Field>
        <Field
          id="newPassword"
          label="Kata sandi baru"
          hint="Minimal 8 karakter"
          error={fe.newPassword}
        >
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <Field id="confirmPassword" label="Konfirmasi kata sandi baru" error={fe.confirmPassword}>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
      </div>

      <SubmitButton>Simpan</SubmitButton>
    </form>
  );
}
