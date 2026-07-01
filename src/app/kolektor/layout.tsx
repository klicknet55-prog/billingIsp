import { AppShell } from "@/components/layout/app-shell";
import { WrongAppScreen } from "@/components/layout/wrong-app-screen";
import { getCurrentActor, requireUser } from "@/lib/auth";
import { getAppOrigin } from "@/lib/site-server";

export default async function KolektorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getCurrentActor();
  if (actor?.type === "pelanggan") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <WrongAppScreen variant="admin-for-pelanggan" />
      </div>
    );
  }

  const [user, appOrigin] = await Promise.all([
    requireUser(["kolektor"]),
    getAppOrigin(),
  ]);
  return (
    <AppShell variant="kolektor" userName={user.nama} userRole={user.role} appOrigin={appOrigin}>
      {children}
    </AppShell>
  );
}
