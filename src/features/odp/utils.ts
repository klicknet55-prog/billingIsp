/** Kapasitas port default dari splitter pasif (mis. 1:8 → 8). */
export function kapasitasFromSplitterPasif(splitterPasif: string | null | undefined): number | null {
  if (!splitterPasif?.trim()) return null;
  const m = /^1:(\d+)$/.exec(splitterPasif.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 2 ? n : null;
}

export const SPLITTER_PASIF_OPTIONS = ["1:2", "1:4", "1:8", "1:16", "1:32"] as const;

/** Label port standar: P1, P2, … */
export function odpPortLabel(index: number): string {
  return `P${index}`;
}

/** Daftar label port 1..kapasitas. */
export function odpPortLabels(kapasitas: number): string[] {
  const n = Math.max(0, Math.floor(kapasitas));
  return Array.from({ length: n }, (_, i) => odpPortLabel(i + 1));
}

/** Normalisasi input port (3 → P3, p3 → P3). */
export function normalizeOdpPort(port: string): string {
  const t = port.trim().toUpperCase();
  const numeric = /^(\d+)$/.exec(t);
  if (numeric) return `P${numeric[1]}`;
  return t;
}

/** Port yang masih bisa dipilih; keepPort tetap muncul saat edit. */
export function availableOdpPorts(
  kapasitas: number,
  usedPorts: string[],
  keepPort?: string | null
): string[] {
  const used = new Set(usedPorts.map((p) => normalizeOdpPort(p)));
  const keep = keepPort?.trim() ? normalizeOdpPort(keepPort) : null;
  return odpPortLabels(kapasitas).filter((p) => !used.has(p) || p === keep);
}
