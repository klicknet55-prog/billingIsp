import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { getPlatformBrand } from "@/features/platform-settings/service";
import { getAppOrigin } from "@/lib/site";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, appOrigin, brand] = await Promise.all([
    requireUser(["superadmin"]),
    getAppOrigin(),
    getPlatformBrand(),
  ]);
  return (
    <AppShell
      variant="superadmin"
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
