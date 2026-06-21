"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_MAP_CENTER, getMapTileUrl } from "@/lib/maps/tile-url";
import { fixLeafletDefaultIcons, mapPinDivIcon } from "@/lib/maps/leaflet-icons";

interface MapPinPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  height?: string;
  label?: string;
}

export function MapPinPicker({
  latitude,
  longitude,
  height = "220px",
  label = "Lokasi",
}: MapPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const [lat, setLat] = useState<number | "">(latitude ?? "");
  const [lng, setLng] = useState<number | "">(longitude ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gpsError, setGpsError] = useState("");

  function setPosition(nextLat: number, nextLng: number) {
    setLat(nextLat);
    setLng(nextLng);
    const L = leafletRef.current;
    if (!L || !mapRef.current) return;

    if (!markerRef.current) {
      markerRef.current = L.marker([nextLat, nextLng], { icon: mapPinDivIcon(L) }).addTo(
        mapRef.current
      );
    } else {
      markerRef.current.setLatLng([nextLat, nextLng]);
    }
    mapRef.current.setView([nextLat, nextLng], Math.max(mapRef.current.getZoom(), 16));
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    void (async () => {
      const leafletModule = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const L = leafletModule;
      fixLeafletDefaultIcons(L);
      leafletRef.current = L;

      const startLat = latitude ?? DEFAULT_MAP_CENTER.lat;
      const startLng = longitude ?? DEFAULT_MAP_CENTER.lng;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(
        [startLat, startLng],
        latitude != null ? 16 : 13
      );
      L.tileLayer(getMapTileUrl(), {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e) => {
        setPosition(e.latlng.lat, e.latlng.lng);
      });

      if (latitude != null && longitude != null) {
        markerRef.current = L.marker([latitude, longitude], { icon: mapPinDivIcon(L) }).addTo(map);
      }

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      setReady(false);
    };
  }, [latitude, longitude]);

  function useGps() {
    setGpsError("");
    if (!ready) {
      setGpsError("Peta masih dimuat, coba lagi sebentar.");
      return;
    }
    if (!navigator.geolocation) {
      setGpsError("GPS tidak didukung perangkat ini.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition(pos.coords.latitude, pos.coords.longitude),
      () => setGpsError("Gagal mengambil lokasi GPS."),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={useGps} disabled={!ready}>
          <LocateFixed className="mr-1 h-4 w-4" />
          Lokasi saya
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Klik peta untuk menentukan titik lokasi.</p>
      {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
      <div
        ref={containerRef}
        className="overflow-hidden rounded-md border"
        style={{ height, width: "100%" }}
      />
      <input type="hidden" name="latitude" value={lat === "" ? "" : String(lat)} />
      <input type="hidden" name="longitude" value={lng === "" ? "" : String(lng)} />
      <button
        type="button"
        className="text-xs text-muted-foreground underline"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? "Sembunyikan koordinat manual" : "Input koordinat manual (advanced)"}
      </button>
      {showAdvanced && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="latitude-manual">Latitude</Label>
            <Input
              id="latitude-manual"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Number(e.target.value);
                setLat(v);
                if (typeof v === "number" && typeof lng === "number") setPosition(v, lng);
              }}
              placeholder="-6.2"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="longitude-manual">Longitude</Label>
            <Input
              id="longitude-manual"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Number(e.target.value);
                setLng(v);
                if (typeof lat === "number" && typeof v === "number") setPosition(lat, v);
              }}
              placeholder="106.8"
            />
          </div>
        </div>
      )}
    </div>
  );
}
