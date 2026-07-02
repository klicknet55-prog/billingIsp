import type { MapPlaceResult } from "./types";

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    types?: string[];
  }>;
};

/** Pencarian wilayah via Google Geocoding API. */
export async function searchPlacesGoogle(query: string, apiKey: string): Promise<MapPlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  if (!apiKey.trim()) {
    throw new Error("API key Google Geocoding belum diset. Atur di Superadmin → Integrasi.");
  }

  const params = new URLSearchParams({
    address: q,
    key: apiKey.trim(),
    region: "id",
    language: "id",
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Google Geocoding gagal (${res.status}).`);
  }

  const data = (await res.json()) as GoogleGeocodeResponse;

  if (data.status === "ZERO_RESULTS") return [];
  if (data.status !== "OK") {
    throw new Error(data.error_message || `Google Geocoding: ${data.status}`);
  }

  const mapped: (MapPlaceResult | null)[] = (data.results ?? []).map((item) => {
    const lat = item.geometry?.location?.lat;
    const lng = item.geometry?.location?.lng;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      label: item.formatted_address?.trim() || q,
      latitude: lat,
      longitude: lng,
      kind: item.types?.[0],
    };
  });

  return mapped.filter((r): r is MapPlaceResult => r !== null);
}
