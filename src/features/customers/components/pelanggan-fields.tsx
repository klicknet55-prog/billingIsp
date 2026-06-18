"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Pelanggan } from "@/lib/db/schema";

interface RouterOption {
  id: string;
  label: string;
  tipe: "pppoe" | "hotspot";
}

interface PaketOption {
  id: string;
  label: string;
  routerId: string | null;
}

function dateValue(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function PelangganFields({
  defaults,
  paketOptions,
  routerOptions,
}: {
  defaults?: Pelanggan;
  paketOptions: PaketOption[];
  routerOptions: RouterOption[];
}) {
  const [routerId, setRouterId] = useState(defaults?.routerId ?? "");
  const [paketId, setPaketId] = useState(defaults?.paketInternetId ?? "");
  const selectedRouter = routerOptions.find((r) => r.id === routerId);
  const [connectionType, setConnectionType] = useState<"pppoe" | "hotspot">(
    defaults?.connectionType ?? selectedRouter?.tipe ?? "pppoe"
  );

  const filteredPakets = useMemo(
    () => (routerId ? paketOptions.filter((p) => p.routerId === routerId) : []),
    [paketOptions, routerId]
  );

  const paketValid = !paketId || filteredPakets.some((p) => p.id === paketId);
  const effectivePaketId = paketValid ? paketId : "";

  function onRouterChange(nextRouterId: string) {
    setRouterId(nextRouterId);
    const router = routerOptions.find((r) => r.id === nextRouterId);
    if (router) setConnectionType(router.tipe);
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
              {o.label} ({o.tipe.toUpperCase()})
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
              {o.label}
            </option>
          ))}
        </Select>
        {routerId && filteredPakets.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Belum ada paket untuk router ini. Tambah paket di menu Paket Internet.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="connectionType">Tipe Koneksi</Label>
        <Select
          id="connectionType"
          name="connectionType"
          value={connectionType}
          onChange={(e) => setConnectionType(e.target.value === "hotspot" ? "hotspot" : "pppoe")}
        >
          <option value="pppoe">PPPoE</option>
          <option value="hotspot">Hotspot</option>
        </Select>
        {selectedRouter && connectionType !== selectedRouter.tipe && (
          <p className="text-xs text-amber-600">
            Router ini bertipe {selectedRouter.tipe.toUpperCase()}. Disarankan samakan tipe koneksi.
          </p>
        )}
      </div>
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
        <Label htmlFor="latitude">Latitude</Label>
        <Input
          id="latitude"
          name="latitude"
          type="number"
          step="any"
          defaultValue={defaults?.latitude ?? ""}
          placeholder="-6.2"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="longitude">Longitude</Label>
        <Input
          id="longitude"
          name="longitude"
          type="number"
          step="any"
          defaultValue={defaults?.longitude ?? ""}
          placeholder="106.8"
        />
      </div>
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
