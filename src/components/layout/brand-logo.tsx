"use client";

import { Network } from "lucide-react";
import { useState } from "react";

export function BrandLogo({
  logoUrl,
  name,
  className = "h-7 w-7 rounded-sm object-cover",
}: {
  logoUrl: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Network className="size-7 text-primary" />;
  return (
    <img
      src={logoUrl}
      alt={name}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
