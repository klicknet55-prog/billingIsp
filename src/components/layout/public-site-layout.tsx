import Link from "next/link";
import { PlatformSiteBrand } from "@/components/layout/platform-site-brand";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { getPlatformBrand } from "@/features/platform-settings/service";

export async function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  const brand = await getPlatformBrand();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <PlatformSiteBrand />
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/portal/login">Portal Pelanggan</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter brandName={brand.name} />
    </div>
  );
}
