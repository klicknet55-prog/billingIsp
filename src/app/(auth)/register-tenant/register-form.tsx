"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerTenantAction } from "@/features/tenants/actions";
import type { ActionState } from "@/features/auth/actions";
import { cn, formatRupiah } from "@/lib/utils";
import { RegisterTermsModal } from "./register-terms-modal";

interface Pkg {
  id: string;
  nama: string;
  hargaBulanan: number;
  diskonTahunanPersen: number;
  limitasi: { maxPelanggan: number; maxRouter: number; fitur: string[] };
}

const initial: ActionState = {};
type BillingPeriod = "monthly" | "yearly";

function packageAmount(pkg: Pkg, billingPeriod: BillingPeriod) {
  if (pkg.hargaBulanan <= 0 || billingPeriod === "monthly") return pkg.hargaBulanan;
  return Math.round((pkg.hargaBulanan * 12 * (100 - pkg.diskonTahunanPersen)) / 100);
}

export function RegisterForm({
  packages,
  tcTitle,
  tcContent,
}: {
  packages: Pkg[];
  tcTitle: string;
  tcContent: string;
}) {
  const [state, action, pending] = useActionState(registerTenantAction, initial);
  const [selected, setSelected] = useState(packages[0]?.id ?? "");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const selectedPackage = packages.find((p) => p.id === selected);
  const effectiveBillingPeriod =
    selectedPackage && selectedPackage.hargaBulanan <= 0 ? "monthly" : billingPeriod;

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
      <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-6">
        <div className="inline-flex rounded-lg border bg-muted/30 p-1 text-sm">
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors",
              billingPeriod === "monthly" && "bg-background font-medium shadow-sm"
            )}
          >
            Per bulan
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod("yearly")}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors",
              billingPeriod === "yearly" && "bg-background font-medium shadow-sm"
            )}
          >
            Per tahun
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {packages.map((p) => {
            const isFree = p.hargaBulanan <= 0;
            const period = isFree ? "monthly" : billingPeriod;
            const amount = packageAmount(p, period);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors hover:border-primary",
                  selected === p.id && "border-primary ring-2 ring-ring"
                )}
              >
                <div className="font-semibold">{p.nama}</div>
                <div className="mt-1 text-lg font-bold text-primary">
                  {amount === 0 ? "Gratis" : formatRupiah(amount)}
                  {amount > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      /{period === "yearly" ? "tahun" : "bln"}
                    </span>
                  )}
                  {isFree && (
                    <div className="text-xs font-normal text-muted-foreground">
                      Khusus Free berlaku 1 bulan
                    </div>
                  )}
                  {period === "yearly" && p.diskonTahunanPersen > 0 && (
                    <div className="text-xs font-normal text-primary">
                      Hemat {p.diskonTahunanPersen}% dari harga bulanan
                    </div>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>Maks {p.limitasi.maxPelanggan} pelanggan</li>
                  <li>Maks {p.limitasi.maxRouter} router</li>
                  <li>{p.limitasi.fitur.length} fitur</li>
                </ul>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="packageId" value={selected} />
        <input type="hidden" name="billingPeriod" value={effectiveBillingPeriod} />
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

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending || !selected}>
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
