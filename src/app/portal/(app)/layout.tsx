import { requirePelanggan } from "@/lib/auth";
import { DEFAULT_BRAND_NAME, getAppOrigin } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";
import { SiteFooterContent } from "@/components/layout/site-footer";
import { PortalNav } from "./portal-nav";

export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePelanggan();
  const [tenant, appOrigin] = await Promise.all([getCurrentTenant(), getAppOrigin()]);
  const brandName = tenant?.namaUsaha ?? DEFAULT_BRAND_NAME;
  return (
    <div className="flex min-h-screen flex-col">
      <PortalNav namaUsaha={brandName} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
      <SiteFooterContent appOrigin={appOrigin} brandName={brandName} />
    </div>
  );
}
