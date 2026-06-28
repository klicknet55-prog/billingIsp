"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerTenantFormAction,
  requestTenantRegisterOtpAction,
} from "@/features/tenants/register-tenant-action";
import type { ActionState } from "@/features/auth/actions";
import { getSaasFeatureInfo } from "@/features/tenants/saas-features";
import { formatRupiah } from "@/lib/utils";
import { RegisterTermsModal } from "./register-terms-modal";
import {
  type BillingPeriod,
  type RegisterPkg,
  packageAmount,
} from "./shared";

const initial: ActionState = {};

export function RegisterForm({
  pkg,
  billingPeriod,
  tcTitle,
  tcContent,
}: {
  pkg: RegisterPkg;
  billingPeriod: BillingPeriod;
  tcTitle: string;
  tcContent: string;
}) {
  const [state, action, pending] = useActionState(registerTenantFormAction, initial);
  const [otpState, otpAction, otpPending] = useActionState(requestTenantRegisterOtpAction, initial);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (otpState.ok) setOtpSent(true);
  }, [otpState.ok]);

  const safePkg: RegisterPkg = {
    id: pkg?.id ?? "",
    nama: pkg?.nama ?? "",
    hargaBulanan: pkg?.hargaBulanan ?? 0,
    diskonTahunanPersen: pkg?.diskonTahunanPersen ?? 0,
    limitasi: {
      maxPelanggan: pkg?.limitasi?.maxPelanggan ?? 0,
      maxRouter: pkg?.limitasi?.maxRouter ?? 0,
      fitur: Array.isArray(pkg?.limitasi?.fitur) ? pkg.limitasi.fitur : [],
    },
  };
  const amount = packageAmount(safePkg, billingPeriod);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    if (termsAccepted) return;
    e.preventDefault();
    setTermsOpen(true);
  }

  function acceptTerms() {
    setTermsAccepted(true);
    setTermsOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      {!pkg?.id && (
        <p className="mb-4 text-sm text-destructive">
          Paket tidak valid.{" "}
          <Link href="/register-tenant" className="underline">
            Pilih paket kembali
          </Link>
        </p>
      )}
      <div className="mb-6 rounded-lg border bg-muted/20 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Paket {safePkg.nama}</h3>
          <p className="text-lg font-bold text-primary">
            {amount === 0 ? "Gratis" : formatRupiah(amount)}
            {amount > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                /{billingPeriod === "yearly" ? "tahun" : "bln"}
              </span>
            )}
          </p>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <li className="flex gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Hingga {safePkg.limitasi.maxPelanggan} pelanggan
          </li>
          <li className="flex gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Hingga {safePkg.limitasi.maxRouter} router
          </li>
          {safePkg.limitasi.fitur.map((key) => (
            <li key={key} className="flex gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {getSaasFeatureInfo(key).label}
            </li>
          ))}
        </ul>
      </div>

      <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="packageId" value={safePkg.id} />
        <input type="hidden" name="billingPeriod" value={billingPeriod} />
        {termsAccepted && <input type="hidden" name="acceptTerms" value="on" />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="namaUsaha">Nama usaha</Label>
            <Input id="namaUsaha" name="namaUsaha" required placeholder="ACME Net" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" name="domain" required placeholder="acme" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminNama">Nama admin</Label>
            <Input id="adminNama" name="adminNama" required placeholder="Nama Anda" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPhone">No. WhatsApp</Label>
            <Input
              id="adminPhone"
              name="adminPhone"
              required
              placeholder="0812xxxxxxx"
              onChange={() => setOtpSent(false)}
            />
            <p className="text-xs text-muted-foreground">
              Nomor unik per tenant. Verifikasi via OTP sebelum lanjut bayar.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="otpCode">Kode verifikasi WhatsApp</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="otpCode"
                name="otpCode"
                inputMode="numeric"
                placeholder="6 digit"
                disabled={!otpSent}
                required
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                disabled={otpPending}
                onClick={() => {
                  const phone =
                    (formRef.current?.elements.namedItem("adminPhone") as HTMLInputElement | null)
                      ?.value ?? "";
                  const fd = new FormData();
                  fd.set("adminPhone", phone);
                  otpAction(fd);
                }}
              >
                {otpPending ? "Mengirim..." : otpSent ? "Kirim ulang" : "Kirim kode"}
              </Button>
            </div>
            {otpState.error && <p className="text-sm text-destructive">{otpState.error}</p>}
            {otpSent && !otpState.error && (
              <p className="text-xs text-primary">Kode OTP dikirim ke WhatsApp. Cek pesan masuk.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="admin@acme.net" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-input"
            checked={termsAccepted}
            onChange={(e) => {
              if (e.target.checked) {
                setTermsOpen(true);
                return;
              }
              setTermsAccepted(false);
            }}
          />
          <span className="text-muted-foreground">
            Saya telah membaca dan menyetujui{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setTermsOpen(true)}
            >
              {tcTitle}
            </button>
            .{" "}
            <Link
              href="/syarat-ketentuan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Buka halaman lengkap
            </Link>
          </span>
        </label>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending || !pkg?.id || !otpSent}>
          {pending ? "Memproses pembayaran..." : "Daftar & Bayar"}
        </Button>
      </form>

      <RegisterTermsModal
        open={termsOpen}
        title={tcTitle}
        content={tcContent}
        onClose={() => setTermsOpen(false)}
        onAccept={acceptTerms}
      />
    </>
  );
}
