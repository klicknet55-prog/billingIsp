import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { isPostgresDeployEnv } from "@/lib/db/pg-backup";
import { FullBackupPanel } from "./full-backup-panel";

export default async function SuperadminBackupPage() {
  await requireUser(["superadmin"]);

  const isPg = isPostgresDeployEnv();

  return (
    <>
      <PageHeader
        title="Backup Platform"
        description={
          isPg
            ? "Snapshot PostgreSQL (pg_dump) untuk disaster recovery."
            : "Snapshot database SQLite untuk disaster recovery."
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Backup penuh database</CardTitle>
          <CardDescription>
            {isPg ? (
              <>
                Menggunakan <code className="text-xs">pg_dump</code> — membutuhkan PostgreSQL client
                tools terpasang di server.
              </>
            ) : (
              <>
                Menggunakan SQLite <code className="text-xs">.backup()</code> — aman saat aplikasi
                berjalan (WAL mode).
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FullBackupPanel format={isPg ? "postgres" : "sqlite"} />
        </CardContent>
      </Card>
    </>
  );
}
