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
      <nav className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href="/tentang" className="hover:text-foreground hover:underline">
          Tentang
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/kontak" className="hover:text-foreground hover:underline">
          Kontak
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/syarat-ketentuan" className="hover:text-foreground hover:underline">
          Syarat & Ketentuan
        </Link>
      </nav>
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
