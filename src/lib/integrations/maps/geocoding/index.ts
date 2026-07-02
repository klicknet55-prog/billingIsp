import "server-only";

import { decryptSecret } from "@/lib/crypto";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { searchPlacesGoogle } from "./google";
import { searchPlacesNominatim } from "./nominatim";
import type { MapGeocodingProvider, MapGeocodingRuntimeConfig, MapPlaceResult } from "./types";

export type { MapGeocodingProvider, MapPlaceResult } from "./types";

export async function getMapGeocodingRuntimeConfig(): Promise<MapGeocodingRuntimeConfig> {
  const settings = await getPlatformSettings();
  const provider: MapGeocodingProvider =
    settings.mapGeocodingProvider === "google" ? "google" : "nominatim";

  let googleApiKey = process.env.GOOGLE_GEOCODING_API_KEY?.trim() ?? "";
  if (!googleApiKey && settings.googleGeocodingApiKeyEncrypted) {
    try {
      googleApiKey = decryptSecret(settings.googleGeocodingApiKeyEncrypted);
    } catch {
      googleApiKey = "";
    }
  }

  return {
    provider,
    googleApiKey: googleApiKey || undefined,
  };
}

/** Label provider untuk UI (tanpa rahasia). */
export async function getMapGeocodingProviderLabel(): Promise<string> {
  const { provider } = await getMapGeocodingRuntimeConfig();
  return provider === "google" ? "Google" : "Nominatim (OSM)";
}

export async function searchMapPlaces(query: string): Promise<MapPlaceResult[]> {
  const config = await getMapGeocodingRuntimeConfig();
  const q = query.trim();
  if (q.length < 3) return [];

  if (config.provider === "google") {
    if (!config.googleApiKey) {
      throw new Error(
        "Mode Google aktif tetapi API key belum diset. Isi di Superadmin → Integrasi → Peta."
      );
    }
    return searchPlacesGoogle(q, config.googleApiKey);
  }

  return searchPlacesNominatim(q);
}
