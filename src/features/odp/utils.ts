/** Kapasitas port default dari splitter pasif (mis. 1:8 → 8). */
export function kapasitasFromSplitterPasif(splitterPasif: string | null | undefined): number | null {
  if (!splitterPasif?.trim()) return null;
  const m = /^1:(\d+)$/.exec(splitterPasif.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 2 ? n : null;
}

export const SPLITTER_PASIF_OPTIONS = ["1:2", "1:4", "1:8", "1:16", "1:32"] as const;
