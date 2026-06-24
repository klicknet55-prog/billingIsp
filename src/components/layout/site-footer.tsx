import "server-only";

import { getAppOrigin } from "@/lib/site-server";
import { SiteFooterContent } from "./site-footer-content";

export { SiteFooterContent } from "./site-footer-content";

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
