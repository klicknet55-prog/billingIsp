"use client";

import { openExternalUrl, resolveMobileUrl } from "@/lib/mobile/open-external-url";

export function CommunityImageLink({ href, alt }: { href: string; alt: string }) {
  const src = resolveMobileUrl(href);

  return (
    <button
      type="button"
      className="block rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => void openExternalUrl(href)}
    >
      <img src={src} alt={alt} className="max-h-80 w-full max-w-xs rounded-md object-contain" />
    </button>
  );
}
