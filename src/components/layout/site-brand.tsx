import { Network } from "lucide-react";
import Link from "next/link";
import { DEFAULT_BRAND_NAME } from "@/lib/site";

export function SiteBrand({
  name = DEFAULT_BRAND_NAME,
  href = "/",
}: {
  name?: string;
  href?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold">
      <Network className="text-primary" />
      {name}
    </Link>
  );
}
