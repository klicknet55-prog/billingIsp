import Link from "next/link";
import {
  COPYRIGHT_TEAM_LABEL,
  DEFAULT_BRAND_NAME,
  getAppOrigin,
} from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteFooterContent({
  appOrigin,
  brandName = DEFAULT_BRAND_NAME,
  className,
}: {
  appOrigin: string;
  brandName?: string;
  className?: string;
}) {
  const year = new Date().getFullYear();
  const teamHref = appOrigin || "/";

  return (
    <footer
      className={cn(
        "border-t px-6 py-4 text-center text-sm text-muted-foreground",
        className
      )}
    >
      <p>
        © {year}{" "}
        <Link href={teamHref} className="font-medium text-foreground hover:underline">
          {COPYRIGHT_TEAM_LABEL}
        </Link>
        {" · "}
        {brandName}
      </p>
    </footer>
  );
}

export async function SiteFooter({
  brandName,
  className,
}: {
  brandName?: string;
  className?: string;
}) {
  const appOrigin = await getAppOrigin();
  return (
    <SiteFooterContent appOrigin={appOrigin} brandName={brandName} className={className} />
  );
}
