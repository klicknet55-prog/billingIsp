"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function MobileMenuDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Tutup menu"
        className="fixed inset-0 z-[850] bg-black/50 md:hidden"
        style={{ touchAction: "manipulation" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-y-0 left-0 z-[860] flex w-[min(100vw,18rem)] flex-col border-r bg-card shadow-xl md:hidden"
        style={{ touchAction: "manipulation" }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <span className="font-semibold">{title}</span>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-accent active:bg-accent/80"
            style={{ touchAction: "manipulation" }}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </>
  );
}
