"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

/** Toggle gelap/terang saja — andal di Chrome mobile (tanpa dropdown). */
export function MobileThemeToggle({ className }: { className?: string }) {
  const { mode, toggleMode } = useTheme();

  return (
    <button
      type="button"
      aria-label={mode === "dark" ? "Mode terang" : "Mode gelap"}
      title={mode === "dark" ? "Mode terang" : "Mode gelap"}
      onClick={() => toggleMode()}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-accent active:bg-accent/80",
        className
      )}
      style={{ touchAction: "manipulation" }}
    >
      {mode === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
