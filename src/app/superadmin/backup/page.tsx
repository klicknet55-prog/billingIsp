import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { FullBackupPanel } from "./full-backup-panel";

export default async function SuperadminBackupPage() {
  await requireUser(["superadmin"]);

  return (
    <>
      <PageHeader
        title="Backup Platform"
        description="Snapshot database SQLite untuk disaster recovery."
      />
      <Card>
        <CardHeader>
          <CardTitle>Backup penuh database</CardTitle>
          <CardDescription>
            Menggunakan SQLite <code className="text-xs">.backup()</code> — aman saat aplikasi
            berjalan (WAL mode).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FullBackupPanel />
        </CardContent>
      </Card>
    </>
  );
}
