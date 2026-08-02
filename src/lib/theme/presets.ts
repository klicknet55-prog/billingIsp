/**
 * Daftar preset warna. Nilai warna sebenarnya didefinisikan di
 * `globals.css` lewat selector `[data-theme="<id>"]`.
 * Menambah tema baru = tambah entri di sini + blok CSS di globals.css.
 */
export interface ThemePreset {
  id: string;
  label: string;
  /** Warna swatch (untuk indikator di UI). */
  swatch: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "default", label: "Default", swatch: "#2563eb" },
  { id: "ocean", label: "Ocean", swatch: "#0891b2" },
  { id: "emerald", label: "Emerald", swatch: "#059669" },
  { id: "violet", label: "Violet", swatch: "#7c3aed" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "amber", label: "Amber", swatch: "#d97706" },
];

export const DEFAULT_PRESET = "rose";
export type ThemeMode = "light" | "dark";
