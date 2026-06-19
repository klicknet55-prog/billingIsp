"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_PRESET, type ThemeMode } from "@/lib/theme/presets";

interface ThemeContextValue {
  preset: string;
  mode: ThemeMode;
  setPreset: (preset: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const PRESET_KEY = "nm-theme-preset";
const MODE_KEY = "nm-theme-mode";

function apply(preset: string, mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = preset;
  root.classList.toggle("dark", mode === "dark");
}

export function ThemeProvider({
  children,
  defaultPreset = DEFAULT_PRESET,
  defaultMode = "light",
}: {
  children: React.ReactNode;
  defaultPreset?: string;
  defaultMode?: ThemeMode;
}) {
  const [preset, setPresetState] = useState(defaultPreset);
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);

  useEffect(() => {
    const storedPreset = localStorage.getItem(PRESET_KEY) ?? defaultPreset;
    const storedMode = (localStorage.getItem(MODE_KEY) as ThemeMode) ?? defaultMode;
    setPresetState(storedPreset);
    setModeState(storedMode);
    apply(storedPreset, storedMode);
  }, [defaultPreset, defaultMode]);

  const setPreset = useCallback((p: string) => {
    setPresetState(p);
    localStorage.setItem(PRESET_KEY, p);
    apply(p, (localStorage.getItem(MODE_KEY) as ThemeMode) ?? "light");
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
    apply(localStorage.getItem(PRESET_KEY) ?? DEFAULT_PRESET, m);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ preset, mode, setPreset, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme harus dipakai di dalam ThemeProvider");
  return ctx;
}
