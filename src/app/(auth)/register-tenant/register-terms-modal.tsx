"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { StaticPageBody } from "@/components/content/static-page-body";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RegisterTermsModal({
  open,
  title,
  content,
  onClose,
  onAccept,
}: {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onAccept: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-hidden
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-terms-title"
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border bg-card shadow-xl"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <h2 id="register-terms-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Baca dan setujui sebelum melanjutkan pendaftaran ISP.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Tutup">
            <X />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <StaticPageBody content={content} />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" onClick={onAccept}>
            Saya Setuju
          </Button>
        </div>
      </div>
    </div>
  );
}
