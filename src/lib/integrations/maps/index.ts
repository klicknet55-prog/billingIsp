import { mapsMock } from "./mock";
import type { MapsClient } from "./types";

export type { LatLng, MapsClient } from "./types";

export function getMapsClient(): MapsClient {
  // Mock (haversine) sudah cukup untuk fitur jarak & navigasi dasar.
  // Implementasi nyata (Distance Matrix API) bisa ditambah di sini.
  switch (process.env.MAPS_DRIVER) {
    case "mock":
    default:
      return mapsMock;
  }
}
