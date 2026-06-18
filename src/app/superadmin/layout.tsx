import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { getAppOrigin } from "@/lib/site";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, appOrigin] = await Promise.all([requireUser(["superadmin"]), getAppOrigin()]);
  return (
    <AppShell variant="superadmin" userName={user.nama} userRole={user.role} appOrigin={appOrigin}>
      {children}
    </AppShell>
  );
}
