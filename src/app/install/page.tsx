import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAppInstalled } from "@/features/install/state";
import { readEnvFile, getDatabaseUrlFromEnv } from "@/features/install/env-writer";
import { InstallerWizard } from "./installer-wizard";

export const metadata: Metadata = {
  title: "Instalasi NetManage — PostgreSQL",
  description: "Setup awal database PostgreSQL, migrasi SQLite, dan akun superadmin.",
};

export default async function InstallPage() {
  const env = await readEnvFile();
  const dbUrl = getDatabaseUrlFromEnv(env);
  if (await isAppInstalled(dbUrl ?? undefined)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Instalasi NetManage</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Setup PostgreSQL, migrasi dari SQLite, dan buat akun Super Admin platform.
          </p>
        </div>
        <InstallerWizard initialDatabaseUrl={dbUrl ?? ""} />
      </div>
    </div>
  );
}
