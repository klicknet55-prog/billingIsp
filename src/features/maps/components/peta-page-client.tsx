"use client";

import dynamic from "next/dynamic";
import { GitBranch, RefreshCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { refreshMapStatusAction } from "@/features/maps/actions";
import { MODEM_STATUS_COLOR, MODEM_STATUS_LABEL } from "@/features/maps/modem-labels";
import type { MapPageData } from "@/features/maps/service";
import type { MapPlaceResult } from "@/lib/integrations/maps/geocoding/types";
import type { ModemMapStatus } from "@/lib/integrations/mikrotik/types";
import { MapPlaceSearch } from "./map-place-search";
import type { OdpRow } from "@/features/odp/service";
import type { RouterMapRow } from "@/features/routers/service";
import type { Router } from "@/lib/db/schema";

const MapCanvas = dynamic(
  () => import("./map-canvas").then((m) => m.MapCanvas),
  { ssr: false, loading: () => <div className="map-canvas-root h-[min(45vh,360px)] animate-pulse rounded-md bg-muted md:h-[min(70vh,560px)]" /> }
);

const OdpPanel = dynamic(
  () => import("@/features/odp/components/odp-panel").then((m) => m.OdpPanel),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-md bg-muted" /> }
);

const RouterMapPanel = dynamic(
  () => import("@/features/routers/components/router-map-panel").then((m) => m.RouterMapPanel),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-md bg-muted" /> }
);

const STATUSES: (ModemMapStatus | "all")[] = ["all", "aktif", "isolir", "gangguan", "unknown"];
const LINES_PREF_KEY = "map-show-odp-lines";

type PetaTab = "peta" | "odp" | "router";

function readLinesPref(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LINES_PREF_KEY) === "1";
}

function parseInitialTab(tab?: string): PetaTab {
  if (tab === "odp" || tab === "router") return tab;
  return "peta";
}

export function PetaPageClient({
  mapData,
  odpRows,
  routerRows,
  routers,
  initialTab = "peta",
  geocodingProviderLabel,
}: {
  mapData: MapPageData;
  odpRows: OdpRow[];
  routerRows: RouterMapRow[];
  routers: Router[];
  initialTab?: string;
  geocodingProviderLabel: string;
}) {
  const [tab, setTab] = useState<PetaTab>(parseInitialTab(initialTab));
  const [statusFilter, setStatusFilter] = useState<ModemMapStatus | "all">("all");
  const [odpFilter, setOdpFilter] = useState<string | "all">("all");
  const [showLines, setShowLines] = useState(false);
  const [mapFocus, setMapFocus] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    token: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setShowLines(readLinesPref());
  }, []);

  function toggleLines() {
    setShowLines((prev) => {
      const next = !prev;
      window.localStorage.setItem(LINES_PREF_KEY, next ? "1" : "0");
      return next;
    });
  }

  function refresh() {
    startTransition(async () => {
      await refreshMapStatusAction();
    });
  }

  function handlePlaceSelect(place: MapPlaceResult) {
    setMapFocus({
      latitude: place.latitude,
      longitude: place.longitude,
      zoom: 14,
      token: Date.now(),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "peta" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("peta")}
        >
          Peta
        </Button>
        <Button
          type="button"
          variant={tab === "odp" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("odp")}
        >
          Kelola ODP
        </Button>
        <Button
          type="button"
          variant={tab === "router" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("router")}
        >
          Kelola Router
        </Button>
      </div>

      {tab === "peta" ? (
        <div className="relative z-0 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <MapPlaceSearch
              providerLabel={geocodingProviderLabel}
              onSelect={handlePlaceSelect}
            />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status modem</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ModemMapStatus | "all")}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "Semua status" : MODEM_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ODP</label>
              <Select value={odpFilter} onChange={(e) => setOdpFilter(e.target.value)}>
                <option value="all">Semua ODP</option>
                {mapData.odps.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.kode}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={refresh}>
              <RefreshCw className={`mr-1 h-4 w-4 ${pending ? "animate-spin" : ""}`} />
              Refresh status
            </Button>
            <Button
              type="button"
              variant={showLines ? "default" : "outline"}
              size="sm"
              onClick={toggleLines}
              title="Tampilkan jalur router → ODP → pelanggan"
            >
              <GitBranch className="mr-1 h-4 w-4" />
              Jalur jaringan {showLines ? "on" : "off"}
            </Button>
          </div>

          <Card>
            <CardContent className="flex flex-wrap gap-4 p-3 text-xs">
              {(Object.keys(MODEM_STATUS_LABEL) as ModemMapStatus[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-white shadow"
                    style={{ background: MODEM_STATUS_COLOR[s] }}
                  />
                  {MODEM_STATUS_LABEL[s]}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rotate-45 border-2 border-white bg-violet-600 shadow" />
                Router
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 border-2 border-white bg-blue-600 shadow" />
                ODP
              </span>
            </CardContent>
          </Card>

          <MapCanvas
            pelanggan={mapData.pelanggan}
            odps={mapData.odps}
            routers={mapData.routers}
            statusFilter={statusFilter}
            odpFilter={odpFilter}
            showLines={showLines}
            focusPoint={mapFocus}
          />
        </div>
      ) : tab === "odp" ? (
        <OdpPanel rows={odpRows} routers={routers} />
      ) : (
        <RouterMapPanel rows={routerRows} />
      )}
    </div>
  );
}
