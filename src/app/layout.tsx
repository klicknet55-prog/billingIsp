import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { CapacitorSystemChrome } from "@/components/mobile/capacitor-system-chrome";
import { PortalDeepLinkBootstrap } from "@/components/mobile/portal-deep-link-bootstrap";
import { PushNotificationBootstrap } from "@/components/mobile/push-notification-bootstrap";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { ToastProvider } from "@/components/ui/toast";
import { getPlatformBrand } from "@/features/platform-settings/service";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const brand = await getPlatformBrand();
    return {
      title: `${brand.name} — Manajemen ISP & RT-RW Net`,
      description: brand.tagline,
      appleWebApp: { capable: true, statusBarStyle: "default" },
      applicationName: brand.name,
    };
  } catch {
    return {
      title: `${DEFAULT_BRAND_NAME} — Manajemen ISP & RT-RW Net`,
      description: "Platform billing & manajemen jaringan untuk ISP dan RT-RW Net.",
      appleWebApp: { capable: true, statusBarStyle: "default" },
      applicationName: DEFAULT_BRAND_NAME,
    };
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Tenant menentukan tema default (lintas device); localStorage menimpa per-perangkat.
  let tenant = null;
  try {
    tenant = await getCurrentTenant();
  } catch {
    /* DB belum siap — mode installer / env belum dikonfigurasi */
  }

  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeInitScript />
        <ThemeProvider
          defaultPreset={tenant?.themePreset ?? "rose"}
          defaultMode={tenant?.themeMode ?? "dark"}
        >
          <CapacitorSystemChrome />
          <PortalDeepLinkBootstrap />
          <PushNotificationBootstrap />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
