"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSaasFeatureInfo } from "@/features/tenants/saas-features";
import { cn, formatRupiah } from "@/lib/utils";
import {
  type BillingPeriod,
  type RegisterPkg,
  packageAmount,
} from "./shared";

export function PackageList({ packages }: { packages: RegisterPkg[] }) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  if (packages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada paket langganan aktif. Hubungi administrator platform.
      </p>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => {
          const isFree = p.hargaBulanan <= 0;
          const period = isFree ? "monthly" : billingPeriod;
          const amount = packageAmount(p, period);
          const href = `/register-tenant/daftar?packageId=${encodeURIComponent(p.id)}&billingPeriod=${period}`;

          return (
            <div
              key={p.id}
              className="flex flex-col rounded-lg border p-4 transition-colors hover:border-primary"
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
              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <Check className="size-3 shrink-0 text-primary" aria-hidden />
                  Maks {p.limitasi.maxPelanggan} pelanggan
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="size-3 shrink-0 text-primary" aria-hidden />
                  Maks {p.limitasi.maxRouter} router
                </li>
                {p.limitasi.fitur.map((key) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <Check className="size-3 shrink-0 text-primary" aria-hidden />
                    {getSaasFeatureInfo(key).label}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-4 w-full">
                <Link href={href}>
                  Daftar <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
