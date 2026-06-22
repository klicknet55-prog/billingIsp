import { SiteBrand } from "@/components/layout/site-brand";
import { getPlatformBrand } from "@/features/platform-settings/service";

export async function PlatformSiteBrand({ href = "/" }: { href?: string }) {
  const brand = await getPlatformBrand();
  return <SiteBrand name={brand.name} logoUrl={brand.logoUrl} href={href} />;
}
