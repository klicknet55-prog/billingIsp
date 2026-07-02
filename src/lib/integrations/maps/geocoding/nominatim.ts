import type { MapPlaceResult } from "./types";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

function nominatimLabel(item: {
  display_name?: string;
  name?: string;
  type?: string;
  class?: string;
  address?: Record<string, string | undefined>;
}): string {
  if (item.display_name?.trim()) return item.display_name.trim();
  const addr = item.address;
  if (addr) {
    const parts = [
      addr.village ?? addr.town ?? addr.city ?? addr.suburb,
      addr.municipality ?? addr.county ?? addr.state_district,
      addr.state,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
  }
  return item.name?.trim() || "Lokasi";
}

/** Pencarian wilayah via OpenStreetMap Nominatim (gratis, default). */
export async function searchPlacesNominatim(query: string): Promise<MapPlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: "8",
    countrycodes: "id",
    addressdetails: "1",
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const res = await fetch(`${NOMINATIM_BASE}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": `NetManage/1.0 (${appUrl})`,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Nominatim gagal (${res.status}). Coba lagi atau ganti ke Google di Superadmin.`);
  }

  const data = (await res.json()) as Array<{
    display_name?: string;
    name?: string;
    lat?: string;
    lon?: string;
    type?: string;
    class?: string;
    address?: Record<string, string | undefined>;
  }>;

  const mapped: (MapPlaceResult | null)[] = data.map((item) => {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      label: nominatimLabel(item),
      latitude: lat,
      longitude: lon,
      kind: item.type ?? item.class,
    };
  });

  return mapped.filter((r): r is MapPlaceResult => r !== null);
}
