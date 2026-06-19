"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { changeSubscriptionPackageAction } from "@/features/tenants/actions";
import { formatRupiah } from "@/lib/utils";

interface PackageOption {
  id: string;
  nama: string;
  hargaBulanan: number;
  diskonTahunanPersen: number;
}
type BillingPeriod = "monthly" | "yearly";

function packageAmount(pkg: PackageOption, billingPeriod: BillingPeriod) {
  if (pkg.hargaBulanan <= 0 || billingPeriod === "monthly") return pkg.hargaBulanan;
  return Math.round((pkg.hargaBulanan * 12 * (100 - pkg.diskonTahunanPersen)) / 100);
}

export function UpgradePackageDialog({
  packages,
  currentPackageId,
  currentBillingPeriod,
}: {
  packages: PackageOption[];
  currentPackageId?: string;
  currentBillingPeriod?: BillingPeriod;
}) {
  const [packageId, setPackageId] = useState(currentPackageId ?? packages[0]?.id ?? "");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(currentBillingPeriod ?? "monthly");
  const selected = useMemo(() => packages.find((p) => p.id === packageId), [packages, packageId]);
  const selectedIsFree = !!selected && selected.hargaBulanan <= 0;
  const effectiveBillingPeriod = selectedIsFree ? "monthly" : billingPeriod;
  const amount = selected ? packageAmount(selected, effectiveBillingPeriod) : 0;
  const sameAsCurrent =
    !!currentPackageId &&
    currentPackageId === packageId &&
    currentBillingPeriod === effectiveBillingPeriod;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="packageId">Pilih Paket Baru</Label>
        <Select
          id="packageId"
          name="packageId"
          value={packageId}
          onChange={(e) => {
            const nextPackageId = e.target.value;
            setPackageId(nextPackageId);
            const nextPackage = packages.find((pkg) => pkg.id === nextPackageId);
            if (nextPackage && nextPackage.hargaBulanan <= 0) setBillingPeriod("monthly");
          }}
          required
        >
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.nama} - {formatRupiah(pkg.hargaBulanan)}/bulan
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingPeriod">Periode tagihan</Label>
        <Select
          id="billingPeriod"
          name="billingPeriod"
          value={effectiveBillingPeriod}
          onChange={(e) => setBillingPeriod(e.target.value === "yearly" ? "yearly" : "monthly")}
          required
        >
          <option value="monthly">Per bulan</option>
          <option value="yearly" disabled={selectedIsFree}>
            Per tahun
            {selected?.diskonTahunanPersen ? ` - diskon ${selected.diskonTahunanPersen}%` : ""}
          </option>
        </Select>
        {selectedIsFree && (
          <p className="text-xs text-muted-foreground">Khusus paket Free hanya berlaku 1 bulan.</p>
        )}
      </div>

      <Dialog
        trigger={
          <Button type="button" disabled={!selected || sameAsCurrent}>
            Konfirmasi Upgrade
          </Button>
        }
        title="Konfirmasi Upgrade Paket"
        description="Perubahan paket akan diproses setelah pembayaran berhasil."
      >
        {(close) => (
          <form action={changeSubscriptionPackageAction} className="space-y-4">
            <input type="hidden" name="returnTo" value="/isp/langganan" />
            <input type="hidden" name="packageId" value={packageId} />
            <input type="hidden" name="billingPeriod" value={effectiveBillingPeriod} />
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{selected?.nama ?? "-"}</div>
              <div className="text-muted-foreground">
                Tagihan upgrade: {selected ? formatRupiah(amount) : "-"} /{" "}
                {effectiveBillingPeriod === "yearly" ? "tahun" : "bulan"}
              </div>
              {selectedIsFree && (
                <div className="text-muted-foreground">Khusus paket Free hanya berlaku 1 bulan.</div>
              )}
              {selected && effectiveBillingPeriod === "yearly" && selected.diskonTahunanPersen > 0 && (
                <div className="text-primary">
                  Diskon tahunan {selected.diskonTahunanPersen}% dari total harga bulanan.
                </div>
              )}
              {selected && effectiveBillingPeriod === "yearly" && (
                <div className="text-xs text-muted-foreground">
                  Harga normal: {formatRupiah(selected.hargaBulanan * 12)}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Batal
              </Button>
              <Button type="submit">Bayar & Upgrade</Button>
            </div>
          </form>
        )}
      </Dialog>
      {sameAsCurrent && (
        <p className="text-xs text-muted-foreground">
          Pilih paket atau periode yang berbeda dari langganan aktif saat ini.
        </p>
      )}
    </div>
  );
}
