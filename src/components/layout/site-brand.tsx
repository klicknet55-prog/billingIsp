import Link from "next/link";
import { Network } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { DEFAULT_BRAND_NAME } from "@/lib/site";

export function SiteBrand({
  name = DEFAULT_BRAND_NAME,
  logoUrl,
  href = "/",
}: {
  name?: string;
  logoUrl?: string | null;
  href?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold">
      {logoUrl ? <BrandLogo logoUrl={logoUrl} name={name} /> : <Network className="text-primary" />}
      <span className="truncate">{name}</span>
    </Link>
  );
}
