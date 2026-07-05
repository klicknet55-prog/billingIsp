"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { downloadMobileFile, openExternalUrl } from "@/lib/mobile/open-external-url";

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
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => {
        if (mode === "download") {
          void downloadMobileFile(href);
        } else {
          openExternalUrl(href);
        }
      }}
    >
      {children}
    </Button>
  );
}
