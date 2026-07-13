"use client";

import { Check, Moon, Palette, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";

/** Pemilih tema mobile: preset warna + mode gelap/terang (kompak, mirip desktop). */
export function MobileThemeSwitcher({ className }: { className?: string }) {
  const { preset, mode, setPreset, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Ganti tema"
        aria-expanded={open}
        title="Ganti tema"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 active:bg-white/25",
          className
        )}
        style={{ touchAction: "manipulation" }}
      >
        <Palette className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-[200] w-[13.5rem] rounded-xl border bg-popover p-2.5 text-popover-foreground shadow-lg">
          <p className="mb-1.5 px-0.5 text-[11px] font-medium text-muted-foreground">Warna tema</p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] leading-tight transition-colors active:bg-accent",
                  preset === p.id && "border-primary"
                )}
              >
                <span
                  className="flex size-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: p.swatch }}
                >
                  {preset === p.id && <Check className="size-3 text-white" />}
                </span>
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 border-t pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full text-xs"
              type="button"
              onClick={toggleMode}
            >
              {mode === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              Mode {mode === "dark" ? "Terang" : "Gelap"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
