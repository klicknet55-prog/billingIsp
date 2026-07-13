import { getCurrentActor, requirePelanggan } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getAppOrigin } from "@/lib/site-server";
import { getCurrentTenant } from "@/lib/tenant";
import { SiteFooterContent } from "@/components/layout/site-footer-content";
import { WrongAppScreen } from "@/components/layout/wrong-app-screen";
import { PortalShell } from "./portal-shell";

export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getCurrentActor();
  if (actor?.type === "user") {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="mx-auto flex w-full max-w-3xl flex-1 items-center p-4">
          <WrongAppScreen variant="portal-for-staff" />
        </main>
      </div>
    );
  }

  await requirePelanggan();
  const [tenant, appOrigin] = await Promise.all([getCurrentTenant(), getAppOrigin()]);
  const brandName = tenant?.namaUsaha ?? DEFAULT_BRAND_NAME;
  return (
    <div className="flex min-h-screen flex-col">
      <PortalShell namaUsaha={brandName}>{children}</PortalShell>
      <div className="fm-desktop-only">
        <SiteFooterContent appOrigin={appOrigin} brandName={brandName} />
      </div>
    </div>
  );
}
