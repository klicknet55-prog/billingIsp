"use client";

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import type { MapOdpMarker, MapPelangganMarker, MapRouterMarker } from "@/features/maps/service";
import { MODEM_STATUS_COLOR, MODEM_STATUS_LABEL } from "@/features/maps/modem-status";
import type { ModemMapStatus } from "@/lib/integrations/mikrotik/types";
import { DEFAULT_MAP_CENTER, getMapTileUrl } from "@/lib/maps/tile-url";
import { fixLeafletDefaultIcons } from "@/lib/maps/leaflet-icons";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

function statusIcon(status: ModemMapStatus) {
  const color = MODEM_STATUS_COLOR[status];
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function routerIcon(isOnline: boolean) {
  const color = isOnline ? "#16a34a" : "#7c3aed";
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transform:rotate(45deg)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function odpIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function navUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pelangganPopup(p: MapPelangganMarker) {
  const status = MODEM_STATUS_LABEL[p.modemStatus];
  const odp = p.odpKode ? `ODP ${p.odpKode}` : "Tanpa ODP";
  return `<div style="min-width:180px">
    <strong>${escapeHtml(p.nama)}</strong><br/>
    Status: ${status}<br/>
    ${odp}<br/>
    <a href="/isp/pelanggan/${p.id}">Detail pelanggan</a> ·
    <a href="${navUrl(p.latitude, p.longitude)}" target="_blank" rel="noreferrer">Navigasi</a>
  </div>`;
}

function odpPopup(o: MapOdpMarker) {
  const pel = o.pelanggan
    .map((p) => `${escapeHtml(p.nama)}${p.odpPort ? ` (${escapeHtml(p.odpPort)})` : ""}`)
    .join("<br/>");
  const inputFrom = o.inputRouterNama
    ? `Router: ${escapeHtml(o.inputRouterNama)}`
    : o.inputOdpKode
      ? `ODP: ${escapeHtml(o.inputOdpKode)}`
      : "-";
  return `<div style="min-width:200px">
    <strong>${escapeHtml(o.kode)}</strong>${o.nama ? ` — ${escapeHtml(o.nama)}` : ""}<br/>
    Input dari: ${inputFrom}<br/>
    Splitter: ${escapeHtml(o.splitterPasif ?? "-")} · Rasio: ${escapeHtml(o.splitterRasio ?? "-")}<br/>
    Redaman: ${o.redamanInputDb ?? "-"} / ${o.redamanOutputDb ?? "-"} dB<br/>
    Port: ${o.portTerpakai}/${o.kapasitasPort}<br/>
    ${pel ? `<small>${pel}</small>` : "<small>Belum ada pelanggan</small>"}
  </div>`;
}

function routerPopup(r: MapRouterMarker) {
  const status = r.isOnline ? "Online" : "Offline";
  return `<div style="min-width:200px">
    <strong>${escapeHtml(r.nama)}</strong><br/>
    Server / Router · ${status}<br/>
    IP: ${escapeHtml(r.ipAddress)}:${escapeHtml(r.apiPort)}<br/>
    Pelanggan: ${r.pelangganCount}<br/>
    <a href="/isp/router">Kelola router</a> ·
    <a href="${navUrl(r.latitude, r.longitude)}" target="_blank" rel="noreferrer">Navigasi</a>
  </div>`;
}

export interface MapCanvasProps {
  pelanggan: MapPelangganMarker[];
  odps: MapOdpMarker[];
  routers?: MapRouterMarker[];
  statusFilter?: ModemMapStatus | "all";
  odpFilter?: string | "all";
  showLines?: boolean;
}

function filteredPelanggan(
  pelanggan: MapPelangganMarker[],
  statusFilter: ModemMapStatus | "all",
  odpFilter: string | "all"
) {
  return pelanggan.filter((p) => {
    if (statusFilter !== "all" && p.modemStatus !== statusFilter) return false;
    if (odpFilter !== "all" && p.odpId !== odpFilter) return false;
    return true;
  });
}

function filteredOdps(odps: MapOdpMarker[], odpFilter: string | "all") {
  return odpFilter === "all" ? odps : odps.filter((o) => o.id === odpFilter);
}

export function MapCanvas({
  pelanggan,
  odps,
  routers = [],
  statusFilter = "all",
  odpFilter = "all",
  showLines = false,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const odpLayerRef = useRef<L.LayerGroup | null>(null);
  const routerLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    fixLeafletDefaultIcons(L);

    const map = L.map(containerRef.current).setView(
      [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng],
      13
    );
    L.tileLayer(getMapTileUrl(), {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    clusterRef.current = L.markerClusterGroup();
    odpLayerRef.current = L.layerGroup();
    routerLayerRef.current = L.layerGroup();
    linesLayerRef.current = L.layerGroup();
    map.addLayer(linesLayerRef.current);
    map.addLayer(routerLayerRef.current);
    map.addLayer(odpLayerRef.current);
    map.addLayer(clusterRef.current);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      odpLayerRef.current = null;
      routerLayerRef.current = null;
      linesLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    const odpLayer = odpLayerRef.current;
    const routerLayer = routerLayerRef.current;
    if (!map || !cluster || !odpLayer || !routerLayer) return;

    cluster.clearLayers();
    odpLayer.clearLayers();
    routerLayer.clearLayers();

    const bounds: L.LatLngExpression[] = [];
    const visibleOdps = filteredOdps(odps, odpFilter);
    const visiblePelanggan = filteredPelanggan(pelanggan, statusFilter, odpFilter);

    for (const r of routers) {
      bounds.push([r.latitude, r.longitude]);
      L.marker([r.latitude, r.longitude], { icon: routerIcon(r.isOnline), zIndexOffset: 500 })
        .bindPopup(routerPopup(r))
        .addTo(routerLayer);
    }

    for (const o of visibleOdps) {
      bounds.push([o.latitude, o.longitude]);
      L.marker([o.latitude, o.longitude], { icon: odpIcon() })
        .bindPopup(odpPopup(o))
        .addTo(odpLayer);
    }

    for (const p of visiblePelanggan) {
      bounds.push([p.latitude, p.longitude]);
      const m = L.marker([p.latitude, p.longitude], { icon: statusIcon(p.modemStatus) });
      m.bindPopup(pelangganPopup(p));
      cluster.addLayer(m);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 16 });
    }
  }, [pelanggan, odps, routers, statusFilter, odpFilter]);

  useEffect(() => {
    const linesLayer = linesLayerRef.current;
    if (!linesLayer) return;

    linesLayer.clearLayers();
    if (!showLines) return;

    const odpById = new Map(odps.map((o) => [o.id, o]));
    const routerById = new Map(routers.map((r) => [r.id, r]));
    const visiblePelanggan = filteredPelanggan(pelanggan, statusFilter, odpFilter);

    for (const o of odps) {
      if (o.inputRouterId) {
        const r = routerById.get(o.inputRouterId);
        if (r) {
          L.polyline(
            [
              [r.latitude, r.longitude],
              [o.latitude, o.longitude],
            ],
            { color: "#7c3aed", weight: 3, opacity: 0.75, dashArray: "8 6" }
          )
            .bindTooltip(`${r.nama} → ${o.kode}`, { sticky: true, opacity: 0.9 })
            .addTo(linesLayer);
        }
      }
      if (o.inputOdpId) {
        const parent = odpById.get(o.inputOdpId);
        if (parent) {
          L.polyline(
            [
              [parent.latitude, parent.longitude],
              [o.latitude, o.longitude],
            ],
            { color: "#2563eb", weight: 2.5, opacity: 0.7, dashArray: "6 5" }
          )
            .bindTooltip(`${parent.kode} → ${o.kode}`, { sticky: true, opacity: 0.9 })
            .addTo(linesLayer);
        }
      }
    }

    for (const p of visiblePelanggan) {
      if (!p.odpId) continue;
      const o = odpById.get(p.odpId);
      if (!o) continue;
      if (odpFilter !== "all" && o.id !== odpFilter) continue;

      L.polyline(
        [
          [o.latitude, o.longitude],
          [p.latitude, p.longitude],
        ],
        {
          color: MODEM_STATUS_COLOR[p.modemStatus],
          weight: 2,
          opacity: 0.65,
          dashArray: "6 5",
        }
      )
        .bindTooltip(`${o.kode} → ${p.nama}`, { sticky: true, opacity: 0.9 })
        .addTo(linesLayer);
    }
  }, [pelanggan, odps, routers, statusFilter, odpFilter, showLines]);

  return (
    <div
      ref={containerRef}
      className="h-[min(70vh,560px)] w-full overflow-hidden rounded-md border"
    />
  );
}
