"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FinanceMobileSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Tutup"
        className="fixed inset-0 z-[900] bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[910] mx-auto max-h-[85dvh] w-full max-w-lg rounded-t-[1.5rem] border bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.15)]",
          "pb-[env(safe-area-inset-bottom,0px)]",
          className
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Tutup panel"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(85dvh-3.5rem)] overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
