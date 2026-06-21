"use client";

import { useMemo, useState } from "react";
import { MapPinPicker } from "@/components/maps/map-pin-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Pelanggan } from "@/lib/db/schema";

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

interface OdpOption {
  id: string;
  kode: string;
  nama: string | null;
  kapasitasPort: number;
}

function dateValue(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function PelangganFields({
  defaults,
  paketOptions,
  routerOptions,
  odpOptions = [],
}: {
  defaults?: Pelanggan;
  paketOptions: PaketOption[];
  routerOptions: RouterOption[];
  odpOptions?: OdpOption[];
}) {
  const [routerId, setRouterId] = useState(defaults?.routerId ?? "");
  const [paketId, setPaketId] = useState(defaults?.paketInternetId ?? "");

  const filteredPakets = useMemo(
    () => (routerId ? paketOptions.filter((p) => p.routerId === routerId) : []),
    [paketOptions, routerId]
  );

  const paketValid = !paketId || filteredPakets.some((p) => p.id === paketId);
  const effectivePaketId = paketValid ? paketId : "";
  const selectedPaket = filteredPakets.find((p) => p.id === effectivePaketId);
  const connectionType = selectedPaket?.tipe ?? defaults?.connectionType ?? "pppoe";

  function onRouterChange(nextRouterId: string) {
    setRouterId(nextRouterId);
    const nextPakets = nextRouterId
      ? paketOptions.filter((p) => p.routerId === nextRouterId)
      : [];
    if (paketId && !nextPakets.some((p) => p.id === paketId)) {
      setPaketId("");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="nama">Nama</Label>
        <Input id="nama" name="nama" defaultValue={defaults?.nama} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="noWa">No. WhatsApp</Label>
        <Input id="noWa" name="noWa" defaultValue={defaults?.noWa} placeholder="0812xxxx" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="routerId">Router</Label>
        <Select
          id="routerId"
          name="routerId"
          value={routerId}
          onChange={(e) => onRouterChange(e.target.value)}
        >
          <option value="">- Pilih router -</option>
          {routerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="paketInternetId">Paket Internet</Label>
        <Select
          id="paketInternetId"
          name="paketInternetId"
          value={effectivePaketId}
          disabled={!routerId}
          onChange={(e) => setPaketId(e.target.value)}
        >
          <option value="">
            {!routerId ? "Pilih router terlebih dahulu" : "- Pilih paket -"}
          </option>
          {filteredPakets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} ({o.tipe.toUpperCase()})
            </option>
          ))}
        </Select>
        {routerId && filteredPakets.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Belum ada paket untuk router ini. Tambah paket di menu Paket Internet.
          </p>
        )}
        {selectedPaket && (
          <p className="text-xs text-muted-foreground">
            Tipe koneksi mengikuti paket: {selectedPaket.tipe.toUpperCase()}.
          </p>
        )}
      </div>
      <input type="hidden" name="connectionType" value={connectionType} />
      <div className="space-y-2">
        <Label htmlFor="connectionUsername">Username</Label>
        <Input
          id="connectionUsername"
          name="connectionUsername"
          defaultValue={defaults?.connectionUsername ?? ""}
          placeholder="user123"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="connectionPassword">Password</Label>
        <Input
          id="connectionPassword"
          name="connectionPassword"
          type="text"
          defaultValue={defaults?.connectionPassword ?? ""}
          placeholder="******"
          required
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="alamat">Alamat</Label>
        <Input id="alamat" name="alamat" defaultValue={defaults?.alamat ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="odpId">ODP</Label>
        <Select id="odpId" name="odpId" defaultValue={defaults?.odpId ?? ""}>
          <option value="">- Tanpa ODP -</option>
          {odpOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.kode}
              {o.nama ? ` — ${o.nama}` : ""} (max {o.kapasitasPort} port)
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="odpPort">Port ODP</Label>
        <Input
          id="odpPort"
          name="odpPort"
          defaultValue={defaults?.odpPort ?? ""}
          placeholder="P3"
        />
      </div>
      <MapPinPicker
        latitude={defaults?.latitude}
        longitude={defaults?.longitude}
        label="Lokasi pelanggan"
      />
      <div className="space-y-2">
        <Label htmlFor="ipAddress">IP Address</Label>
        <Input id="ipAddress" name="ipAddress" defaultValue={defaults?.ipAddress ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tglJatuhTempo">Jatuh Tempo</Label>
        <Input
          id="tglJatuhTempo"
          name="tglJatuhTempo"
          type="date"
          defaultValue={dateValue(defaults?.tglJatuhTempo)}
        />
      </div>
    </div>
  );
}
