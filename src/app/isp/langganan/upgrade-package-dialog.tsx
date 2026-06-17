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
}

export function UpgradePackageDialog({
  packages,
  currentPackageId,
}: {
  packages: PackageOption[];
  currentPackageId?: string;
}) {
  const [packageId, setPackageId] = useState(currentPackageId ?? packages[0]?.id ?? "");
  const selected = useMemo(() => packages.find((p) => p.id === packageId), [packages, packageId]);
  const sameAsCurrent = !!currentPackageId && currentPackageId === packageId;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="packageId">Pilih Paket Baru</Label>
        <Select
          id="packageId"
          name="packageId"
          value={packageId}
          onChange={(e) => setPackageId(e.target.value)}
          required
        >
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.nama} - {formatRupiah(pkg.hargaBulanan)}/bulan
            </option>
          ))}
        </Select>
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
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{selected?.nama ?? "-"}</div>
              <div className="text-muted-foreground">
                Tagihan upgrade: {selected ? formatRupiah(selected.hargaBulanan) : "-"} / bulan
              </div>
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
          Pilih paket yang berbeda dari paket aktif saat ini.
        </p>
      )}
    </div>
  );
}
