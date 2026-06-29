import type { Metadata } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-script";
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
    };
  } catch {
    return {
      title: `${DEFAULT_BRAND_NAME} — Manajemen ISP & RT-RW Net`,
      description: "Platform billing & manajemen jaringan untuk ISP dan RT-RW Net.",
    };
  }
}

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider
          defaultPreset={tenant?.themePreset ?? "default"}
          defaultMode={tenant?.themeMode ?? "light"}
        >
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
