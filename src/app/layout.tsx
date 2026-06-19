import type { Metadata } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { ToastProvider } from "@/components/ui/toast";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";
import "./globals.css";

export const metadata: Metadata = {
  title: `${DEFAULT_BRAND_NAME} — Manajemen ISP & RT-RW Net`,
  description: "Platform billing & manajemen jaringan untuk ISP dan RT-RW Net.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Tenant menentukan tema default (lintas device); localStorage menimpa per-perangkat.
  const tenant = await getCurrentTenant();

  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeScript />
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
