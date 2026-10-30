import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { getPlatformBrand } from "@/features/platform-settings/service";
import { getAppOrigin } from "@/lib/site-server";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const [user, appOrigin, brand] = await Promise.all([
    requireUser(["sales"]),
    getAppOrigin(),
    getPlatformBrand(),
  ]);
  return (
    <AppShell
      variant="sales"
      userName={user.nama}
      userRole={user.role}
      appOrigin={appOrigin}
      brandName={brand.name}
      brandLogoUrl={brand.logoUrl}
    >
      {children}
    </AppShell>
  );
}
