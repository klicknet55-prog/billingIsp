import { SiteBrand } from "@/components/layout/site-brand";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinanceMobileInit } from "@/components/mobile/finance";
import { redirectIfAuthenticatedFromPortalLogin } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";
import { PortalLoginDesktop, PortalLoginMobile } from "./portal-login-mobile";

function loginErrorMessage(error?: string): string | null {
  switch (error) {
    case "expired":
      return "Link masuk kedaluwarsa. Minta OTP baru di bawah.";
    case "invalid":
    case "link":
      return "Link masuk tidak valid. Minta OTP baru di bawah.";
    case "config":
      return "Auto-login belum dikonfigurasi di server.";
    default:
      return null;
  }
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectIfAuthenticatedFromPortalLogin();

  const { error } = await searchParams;
  const errorMessage = loginErrorMessage(error);
  const tenant = await getCurrentTenant();
  const brandName = tenant?.namaUsaha ?? DEFAULT_BRAND_NAME;

  return (
    <>
      <FinanceMobileInit />
      <PortalLoginMobile brandName={brandName} />

      <div className="fm-desktop-only flex min-h-screen flex-col">
        <header className="nm-mobile-chrome-top flex items-center justify-between px-6 py-4">
          <SiteBrand />
          <ThemeSwitcher />
        </header>
        <main className="nm-page-safe-bottom flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-xl">Portal Pelanggan</CardTitle>
              <CardDescription>Masuk tanpa password menggunakan OTP WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
              {errorMessage && (
                <p className="mb-4 text-sm text-destructive">{errorMessage}</p>
              )}
              <PortalLoginDesktop errorMessage={errorMessage} />
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
