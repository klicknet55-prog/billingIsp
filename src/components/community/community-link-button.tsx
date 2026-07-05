"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { downloadApkFile, openExternalUrl } from "@/lib/mobile/open-external-url";

export function CommunityLinkButton({
  href,
  mode,
  variant = "outline",
  size,
  children,
}: {
  href: string;
  mode: "download" | "external";
  variant?: "default" | "outline";
  size?: "default" | "sm";
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "download") {
        await downloadApkFile(href);
        toast({
          title: "Unduh dibuka",
          description: "Cek notifikasi Download di HP, lalu tap file APK untuk install.",
          variant: "success",
        });
      } else {
        await openExternalUrl(href);
      }
    } catch (err) {
      toast({
        title: mode === "download" ? "Gagal unduh APK" : "Gagal membuka link",
        description: err instanceof Error ? err.message : "Coba lagi.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={busy} onClick={() => void handleClick()}>
      {busy && mode === "download" ? "Membuka unduh…" : children}
    </Button>
  );
}
