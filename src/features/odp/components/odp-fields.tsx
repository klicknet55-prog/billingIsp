"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Odp } from "@/lib/db/schema";
import { SPLITTER_PASIF_OPTIONS, kapasitasFromSplitterPasif } from "../utils";

const MapPinPicker = dynamic(
  () => import("@/components/maps/map-pin-picker").then((m) => m.MapPinPicker),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse rounded-md bg-muted" /> }
);

interface RouterOption {
  id: string;
  nama: string;
}

interface OdpOption {
  id: string;
  kode: string;
  nama: string | null;
}

function initialSourceType(defaults?: Odp): "" | "router" | "odp" {
  if (defaults?.inputOdpId) return "odp";
  if (defaults?.inputRouterId) return "router";
  return "";
}

function initialSourceId(defaults?: Odp): string {
  return defaults?.inputOdpId ?? defaults?.inputRouterId ?? "";
}

export function OdpFields({
  defaults,
  routerOptions,
  odpOptions,
}: {
  defaults?: Odp;
  routerOptions: RouterOption[];
  odpOptions: OdpOption[];
}) {
  const [splitterPasif, setSplitterPasif] = useState(defaults?.splitterPasif ?? "1:8");
  const [sourceType, setSourceType] = useState<"" | "router" | "odp">(initialSourceType(defaults));
  const [sourceId, setSourceId] = useState(initialSourceId(defaults));
  const autoKap = kapasitasFromSplitterPasif(splitterPasif) ?? 8;

  const parentOdpOptions = useMemo(
    () => odpOptions.filter((o) => o.id !== defaults?.id),
    [odpOptions, defaults?.id]
  );

  function onSourceTypeChange(next: "" | "router" | "odp") {
    setSourceType(next);
    setSourceId("");
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="kode">ID ODP</Label>
        <Input id="kode" name="kode" defaultValue={defaults?.kode} required placeholder="ODP-001" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nama">Nama lokasi</Label>
        <Input id="nama" name="nama" defaultValue={defaults?.nama ?? ""} placeholder="Depan masjid" />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="inputSourceType">Sumber input fiber</Label>
        <p className="text-xs text-muted-foreground">
          ODP pertama biasanya dari router/server. ODP cabang dari ODP induk (mis. ODP-2 dari ODP-1).
        </p>
        <Select
          id="inputSourceType"
          name="inputSourceType"
          value={sourceType}
          onChange={(e) => onSourceTypeChange(e.target.value as "" | "router" | "odp")}
        >
          <option value="">- Tanpa sumber (opsional) -</option>
          <option value="router">Router / Server</option>
          <option value="odp">ODP induk</option>
        </Select>
      </div>

      {sourceType === "router" && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="inputSourceId">Router / Server</Label>
          <Select
            id="inputSourceId"
            name="inputSourceId"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            required
          >
            <option value="">- Pilih router -</option>
            {routerOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nama}
              </option>
            ))}
          </Select>
        </div>
      )}

      {sourceType === "odp" && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="inputSourceId">ODP induk</Label>
          <Select
            id="inputSourceId"
            name="inputSourceId"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            required
          >
            <option value="">- Pilih ODP induk -</option>
            {parentOdpOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.kode}
                {o.nama ? ` — ${o.nama}` : ""}
              </option>
            ))}
          </Select>
          {parentOdpOptions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Belum ada ODP lain. Buat ODP pertama dengan sumber router terlebih dahulu.
            </p>
          )}
        </div>
      )}

      {sourceType === "" && <input type="hidden" name="inputSourceId" value="" />}

      <div className="space-y-2">
        <Label htmlFor="splitterPasif">Splitter pasif</Label>
        <Select
          id="splitterPasif"
          name="splitterPasif"
          value={splitterPasif}
          onChange={(e) => setSplitterPasif(e.target.value)}
        >
          <option value="">- Pilih -</option>
          {SPLITTER_PASIF_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="splitterRasio">Rasio splitter</Label>
        <Input
          id="splitterRasio"
          name="splitterRasio"
          defaultValue={defaults?.splitterRasio ?? ""}
          placeholder="10:90"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="redamanInputDb">Redaman input (dB)</Label>
        <Input
          id="redamanInputDb"
          name="redamanInputDb"
          type="number"
          step="any"
          defaultValue={defaults?.redamanInputDb ?? ""}
          placeholder="-20.5"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="redamanOutputDb">Redaman output (dB)</Label>
        <Input
          id="redamanOutputDb"
          name="redamanOutputDb"
          type="number"
          step="any"
          defaultValue={defaults?.redamanOutputDb ?? ""}
          placeholder="-23.2"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kapasitasPort">Kapasitas port</Label>
        <Input
          id="kapasitasPort"
          name="kapasitasPort"
          type="number"
          min={1}
          defaultValue={defaults?.kapasitasPort ?? autoKap}
          key={`kap-${autoKap}`}
        />
        <p className="text-xs text-muted-foreground">Default dari splitter pasif: {autoKap}</p>
      </div>
      <div className="space-y-2 flex items-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={defaults?.isActive ?? true}
            value="true"
          />
          Aktif (tampil di peta)
        </label>
      </div>
      <MapPinPicker
        latitude={defaults?.latitude}
        longitude={defaults?.longitude}
        label="Lokasi ODP"
        height="260px"
      />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="catatan">Catatan</Label>
        <Textarea id="catatan" name="catatan" defaultValue={defaults?.catatan ?? ""} rows={2} />
      </div>
    </div>
  );
}
