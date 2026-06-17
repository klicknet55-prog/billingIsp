export interface LatLng {
  latitude: number | null;
  longitude: number | null;
}

/** Kontrak layanan peta/GIS untuk jarak & navigasi. */
export interface MapsClient {
  /** Jarak garis lurus (km) antara dua titik; null jika koordinat tidak lengkap. */
  distanceKm(a: LatLng, b: LatLng): number | null;
  /** URL navigasi (Google Maps) menuju sebuah titik. */
  navigationUrl(point: LatLng): string | null;
}
