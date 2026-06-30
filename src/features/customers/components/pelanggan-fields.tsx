"use client";

import { useMemo, useState } from "react";
import { MapPinPicker } from "@/components/maps/map-pin-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { availableOdpPorts, normalizeOdpPort } from "@/features/odp/utils";
import type { OdpFormOption } from "@/features/odp/types";
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
  odpOptions?: OdpFormOption[];
}) {
  const [routerId, setRouterId] = useState(defaults?.routerId ?? "");
  const [paketId, setPaketId] = useState(defaults?.paketInternetId ?? "");
  const [odpId, setOdpId] = useState(defaults?.odpId ?? "");
  const [odpPort, setOdpPort] = useState(
    defaults?.odpPort ? normalizeOdpPort(defaults.odpPort) : ""
  );

  const filteredPakets = useMemo(
    () => (routerId ? paketOptions.filter((p) => p.routerId === routerId) : []),
    [paketOptions, routerId]
  );

  const paketValid = !paketId || filteredPakets.some((p) => p.id === paketId);
  const effectivePaketId = paketValid ? paketId : "";
  const selectedPaket = filteredPakets.find((p) => p.id === effectivePaketId);
  const connectionType = selectedPaket?.tipe ?? defaults?.connectionType ?? "pppoe";

  const selectedOdp = odpOptions.find((o) => o.id === odpId);
  const availablePorts = useMemo(() => {
    if (!selectedOdp) return [];
    const keepPort =
      defaults?.odpId === odpId && defaults.odpPort
        ? normalizeOdpPort(defaults.odpPort)
        : odpPort || null;
    return availableOdpPorts(selectedOdp.kapasitasPort, selectedOdp.usedPorts, keepPort);
  }, [selectedOdp, odpId, odpPort, defaults?.odpId, defaults?.odpPort]);

  function onRouterChange(nextRouterId: string) {
    setRouterId(nextRouterId);
    const nextPakets = nextRouterId
      ? paketOptions.filter((p) => p.routerId === nextRouterId)
      : [];
    if (paketId && !nextPakets.some((p) => p.id === paketId)) {
      setPaketId("");
    }
  }

  function onOdpChange(nextOdpId: string) {
    setOdpId(nextOdpId);
    setOdpPort("");
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
        <Select
          id="odpId"
          name="odpId"
          value={odpId}
          onChange={(e) => onOdpChange(e.target.value)}
        >
          <option value="">- Tanpa ODP -</option>
          {odpOptions.map((o) => {
            const sisa = availableOdpPorts(o.kapasitasPort, o.usedPorts).length;
            return (
              <option key={o.id} value={o.id}>
                {o.kode}
                {o.nama ? ` — ${o.nama}` : ""} ({sisa} port tersisa)
              </option>
            );
          })}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="odpPort">Port ODP</Label>
        <Select
          id="odpPort"
          name="odpPort"
          value={odpPort}
          disabled={!odpId}
          required={!!odpId && availablePorts.length > 0}
          onChange={(e) => setOdpPort(e.target.value)}
        >
          <option value="">
            {!odpId
              ? "Pilih ODP terlebih dahulu"
              : availablePorts.length === 0
                ? "Tidak ada port tersisa"
                : "- Pilih port -"}
          </option>
          {availablePorts.map((port) => (
            <option key={port} value={port}>
              {port}
            </option>
          ))}
        </Select>
        {odpId && selectedOdp && (
          <p className="text-xs text-muted-foreground">
            {availablePorts.length} dari {selectedOdp.kapasitasPort} port tersedia.
          </p>
        )}
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
        <Label htmlFor="tglDaftar">Tanggal Pendaftaran</Label>
        <Input
          id="tglDaftar"
          name="tglDaftar"
          type="date"
          defaultValue={dateValue(defaults?.tglDaftar ?? defaults?.createdAt ?? new Date())}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tglJatuhTempo">Jatuh Tempo</Label>
        <Input
          id="tglJatuhTempo"
          name="tglJatuhTempo"
          type="date"
          defaultValue={dateValue(
            defaults?.tglJatuhTempo ??
              (defaults?.tglDaftar ? defaults.tglDaftar : defaults?.createdAt)
          )}
        />
        <p className="text-xs text-muted-foreground">Hari tagihan max tgl 28 (otomatis dari tanggal pendaftaran).</p>
      </div>
    </div>
  );
}
