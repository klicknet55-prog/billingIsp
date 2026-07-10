"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { saveStaticPagesAction } from "@/features/platform-settings/actions";
import type { PlatformSettings } from "@/lib/db/schema";

const initial: ActionState = {};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function StaticPagesForm({ defaults }: { defaults: PlatformSettings }) {
  const [state, action] = useActionState(saveStaticPagesAction, initial);
  const { toast } = useToast();
  const router = useRouter();
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast({ title: "Halaman statis tersimpan", variant: "success" });
      router.refresh();
    }
    if (state.error) toast({ title: state.error, variant: "error" });
    if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      toast({
        title: "Beberapa isian belum valid. Periksa field yang ditandai merah.",
        variant: "error",
      });
    }
  }, [state.ok, state.error, state.fieldErrors, toast, router]);

  return (
    <form
      key={defaults.updatedAt instanceof Date ? defaults.updatedAt.toISOString() : String(defaults.updatedAt)}
      action={action}
      className="space-y-8"
      noValidate
    >
      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Halaman Tentang</h3>
        <Field id="tentangTitle" label="Judul" error={fe.tentangTitle}>
          <input
            id="tentangTitle"
            name="tentangTitle"
            defaultValue={defaults.tentangTitle}
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
        </Field>
        <Field id="tentangContent" label="Isi halaman" error={fe.tentangContent}>
          <Textarea
            id="tentangContent"
            name="tentangContent"
            defaultValue={defaults.tentangContent}
            rows={8}
            className="text-sm"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Pratinjau:{" "}
          <a href="/tentang" target="_blank" rel="noopener noreferrer" className="underline">
            /tentang
          </a>
        </p>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Halaman Kontak</h3>
        <Field id="kontakTitle" label="Judul" error={fe.kontakTitle}>
          <input
            id="kontakTitle"
            name="kontakTitle"
            defaultValue={defaults.kontakTitle}
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
        </Field>
        <Field id="kontakContent" label="Isi halaman" error={fe.kontakContent}>
          <Textarea
            id="kontakContent"
            name="kontakContent"
            defaultValue={defaults.kontakContent}
            rows={6}
            className="text-sm"
          />
        </Field>
        <Field
          id="kontakWhatsapp"
          label="Nomor WhatsApp (tombol Chat)"
          error={fe.kontakWhatsapp}
        >
          <input
            id="kontakWhatsapp"
            name="kontakWhatsapp"
            defaultValue={defaults.kontakWhatsapp ?? ""}
            placeholder="6281234567890"
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Pratinjau:{" "}
          <a href="/kontak" target="_blank" rel="noopener noreferrer" className="underline">
            /kontak
          </a>
        </p>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Syarat & Ketentuan</h3>
        <Field id="tcTitle" label="Judul" error={fe.tcTitle}>
          <input
            id="tcTitle"
            name="tcTitle"
            defaultValue={defaults.tcTitle}
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
        </Field>
        <Field id="tcContent" label="Isi halaman" error={fe.tcContent}>
          <Textarea
            id="tcContent"
            name="tcContent"
            defaultValue={defaults.tcContent}
            rows={10}
            className="text-sm"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Pratinjau:{" "}
          <a
            href="/syarat-ketentuan"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            /syarat-ketentuan
          </a>
        </p>
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Halaman Community (Internal)</h3>
        <Field id="communityDescription" label="Deskripsi komunitas" error={fe.communityDescription}>
          <Textarea
            id="communityDescription"
            name="communityDescription"
            defaultValue={defaults.communityDescription ?? ""}
            rows={4}
            className="text-sm"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Donasi komunitas diproses via Duitku platform (env <code>DUITKU_*</code>). Nominal
          custom minimal Rp 10.000; donatur tercatat di halaman Kontributor.
        </p>
        <Field id="communityApkAdminUrl" label="URL download APK Admin.net" error={fe.communityApkAdminUrl}>
          <input
            id="communityApkAdminUrl"
            name="communityApkAdminUrl"
            type="text"
            inputMode="url"
            defaultValue={defaults.communityApkAdminUrl ?? ""}
            placeholder="https://.../uploads/mobile-apk/..."
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Otomatis terisi saat unggah di Superadmin → Upload APK.
          </p>
        </Field>
        <Field id="communityApkPortalUrl" label="URL download APK MyWiFi" error={fe.communityApkPortalUrl}>
          <input
            id="communityApkPortalUrl"
            name="communityApkPortalUrl"
            type="text"
            inputMode="url"
            defaultValue={defaults.communityApkPortalUrl ?? ""}
            placeholder="https://.../uploads/mobile-apk/..."
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Otomatis terisi saat unggah di Superadmin → Upload APK.
          </p>
        </Field>
        <Field
          id="communityWhatsappSuperadmin"
          label="WhatsApp superadmin"
          error={fe.communityWhatsappSuperadmin}
        >
          <input
            id="communityWhatsappSuperadmin"
            name="communityWhatsappSuperadmin"
            defaultValue={defaults.communityWhatsappSuperadmin ?? ""}
            placeholder="6281234567890"
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
        </Field>
        <Field id="communityTelegramUrl" label="Link group Telegram" error={fe.communityTelegramUrl}>
          <input
            id="communityTelegramUrl"
            name="communityTelegramUrl"
            type="text"
            inputMode="url"
            defaultValue={defaults.communityTelegramUrl ?? ""}
            placeholder="https://t.me/... atau t.me/nama_grup"
            className="h-9 w-full rounded-md border px-3 text-sm"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Pratinjau internal:{" "}
          <a href="/dashboard/community" target="_blank" rel="noopener noreferrer" className="underline">
            /dashboard/community
          </a>
        </p>
      </section>

      <SubmitButton>Simpan Halaman Statis</SubmitButton>
    </form>
  );
}
