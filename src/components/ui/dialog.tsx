"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Modal sederhana tanpa dependensi (Radix). Trigger membuka dialog;
 * konten dirender di overlay tengah layar.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  className,
  dismissible = true,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  className?: string;
  /** false = tidak bisa tutup via backdrop, Escape, atau tombol X */
  dismissible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    if (!dismissible) return;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, dismissible]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            aria-hidden
            className="absolute inset-0 bg-black/50"
            onClick={close}
            disabled={!dismissible}
          />
          <div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative z-10 w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl",
              className
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                aria-label="Tutup"
                disabled={!dismissible}
              >
                <X />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {typeof children === "function" ? children(close) : children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
