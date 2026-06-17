"use client";

import { Check, Moon, Palette, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

export function ThemeSwitcher() {
  const { preset, mode, setPreset, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ganti tema"
        title="Ganti tema"
      >
        <Palette />
      </Button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
            <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Warna tema</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-accent",
                    preset === p.id && "border-primary"
                  )}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: p.swatch }}
                  >
                    {preset === p.id && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="mt-3 border-t pt-3">
              <Button variant="outline" size="sm" className="w-full" onClick={toggleMode}>
                {mode === "dark" ? <Sun /> : <Moon />}
                Mode {mode === "dark" ? "Terang" : "Gelap"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
