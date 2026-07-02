import { PlatformSiteBrand } from "@/components/layout/platform-site-brand";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { getPlatformBrand } from "@/features/platform-settings/service";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const brand = await getPlatformBrand();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="nm-mobile-chrome-top flex items-center justify-between px-6 py-4">
        <PlatformSiteBrand />
        <ThemeSwitcher />
      </header>
      <main className="nm-page-safe-bottom flex flex-1 items-center justify-center p-6">{children}</main>
      <SiteFooter brandName={brand.name} />
    </div>
  );
}
