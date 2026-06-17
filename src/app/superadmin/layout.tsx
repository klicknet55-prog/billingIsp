import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["superadmin"]);
  return (
    <AppShell variant="superadmin" userName={user.nama} userRole={user.role}>
      {children}
    </AppShell>
  );
}
