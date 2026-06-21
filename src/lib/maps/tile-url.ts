/** Tile URL untuk Leaflet (OSM default). Override via NEXT_PUBLIC_MAP_TILE_URL. */
export function getMapTileUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MAP_TILE_URL ??
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  );
}

export const DEFAULT_MAP_CENTER = { lat: -6.2, lng: 106.816 } as const;
