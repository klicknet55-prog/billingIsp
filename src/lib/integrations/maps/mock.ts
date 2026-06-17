import type { LatLng, MapsClient } from "./types";

function hasCoords(p: LatLng): p is { latitude: number; longitude: number } {
  return p.latitude != null && p.longitude != null;
}

/** Haversine: jarak garis lurus dalam km. Cukup untuk pengurutan tugas kolektor. */
export const mapsMock: MapsClient = {
  distanceKm(a, b) {
    if (!hasCoords(a) || !hasCoords(b)) return null;
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 100) / 100;
  },
  navigationUrl(point) {
    if (!hasCoords(point)) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`;
  },
};
