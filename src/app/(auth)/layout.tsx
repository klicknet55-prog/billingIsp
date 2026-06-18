import { SiteBrand } from "@/components/layout/site-brand";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <SiteBrand />
        <ThemeSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
