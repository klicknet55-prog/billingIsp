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
import { PortalLoginForm } from "./portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <SiteBrand />
        <ThemeSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Portal Pelanggan</CardTitle>
            <CardDescription>Masuk tanpa password menggunakan OTP WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <PortalLoginForm />
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
