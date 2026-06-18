import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { getAppOrigin } from "@/lib/site";

export default async function KolektorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, appOrigin] = await Promise.all([requireUser(["kolektor"]), getAppOrigin()]);
  return (
    <AppShell variant="kolektor" userName={user.nama} userRole={user.role} appOrigin={appOrigin}>
      {children}
    </AppShell>
  );
}
