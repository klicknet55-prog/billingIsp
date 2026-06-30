"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createPelangganAction } from "@/features/customers/actions";
import { PelangganFields } from "@/features/customers/components/pelanggan-fields";

interface RouterOption {
  id: string;
  label: string;
}

interface PaketOption {
  id: string;
  label: string;
  routerId: string | null;
  tipe: "pppoe" | "hotspot";
}

import type { OdpFormOption } from "@/features/odp/types";

export function PelangganCreateDialog({
  paketOptions,
  routerOptions,
  odpOptions,
}: {
  paketOptions: PaketOption[];
  routerOptions: RouterOption[];
  odpOptions: OdpFormOption[];
}) {
  return (
    <Dialog
      trigger={
        <Button size="sm">
          <Plus />
          Tambah Pelanggan
        </Button>
      }
      title="Tambah Pelanggan"
      description="Isi data pelanggan baru. Username dan password akan disinkronkan ke Mikrotik jika router terhubung."
      className="max-w-2xl"
    >
      {(closeDialog) => (
        <form action={createPelangganAction} className="space-y-4">
          <PelangganFields
            paketOptions={paketOptions}
            routerOptions={routerOptions}
            odpOptions={odpOptions}
          />
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
