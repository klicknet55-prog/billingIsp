"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerTenantAction } from "@/features/tenants/actions";
import type { ActionState } from "@/features/auth/actions";
import { formatRupiah } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Pkg {
  id: string;
  nama: string;
  hargaBulanan: number;
  limitasi: { maxPelanggan: number; maxRouter: number; fitur: string[] };
}

const initial: ActionState = {};

export function RegisterForm({ packages }: { packages: Pkg[] }) {
  const [state, action, pending] = useActionState(registerTenantAction, initial);
  const [selected, setSelected] = useState(packages[0]?.id ?? "");

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map((p) => (
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
              {p.hargaBulanan === 0 ? "Gratis" : formatRupiah(p.hargaBulanan)}
              {p.hargaBulanan > 0 && (
                <span className="text-xs font-normal text-muted-foreground">/bln</span>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>Maks {p.limitasi.maxPelanggan} pelanggan</li>
              <li>Maks {p.limitasi.maxRouter} router</li>
              <li>{p.limitasi.fitur.length} fitur</li>
            </ul>
          </button>
        ))}
      </div>
      <input type="hidden" name="packageId" value={selected} />

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

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Memproses pembayaran..." : "Daftar & Bayar (simulasi)"}
      </Button>
    </form>
  );
}
