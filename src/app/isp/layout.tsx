import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";

export default async function IspLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const tenant = await getCurrentTenant();
  return (
    <AppShell
      variant="isp"
      userName={user.nama}
      userRole={user.role}
      brandName={tenant?.namaUsaha ?? "NetManage"}
      brandLogoUrl={tenant?.logoUrl ?? null}
    >
      {children}
    </AppShell>
  );
}
