import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";

export default async function KolektorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(["kolektor"]);
  return (
    <AppShell variant="kolektor" userName={user.nama} userRole={user.role}>
      {children}
    </AppShell>
  );
}
