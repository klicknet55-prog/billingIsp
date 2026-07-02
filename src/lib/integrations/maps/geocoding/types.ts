export type MapGeocodingProvider = "nominatim" | "google";

export interface MapPlaceResult {
  label: string;
  latitude: number;
  longitude: number;
  kind?: string;
}

export interface MapGeocodingRuntimeConfig {
  provider: MapGeocodingProvider;
  googleApiKey?: string;
}
