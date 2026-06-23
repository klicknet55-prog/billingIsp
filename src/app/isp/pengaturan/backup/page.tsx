import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listTenantSnapshots } from "@/features/backup/snapshot";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { eq } from "drizzle-orm";
import { BackupPanel } from "../backup-panel";

export default async function BackupPengaturanPage() {
  const user = await requireUser(["owner", "admin"]);
  if (!user.tenantId) {
    return <p className="text-sm text-muted-foreground">Tenant tidak ditemukan.</p>;
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) });
  const snapshots = await listTenantSnapshots(user.tenantId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>
          Export data operasional tenant atau restore dari file backup sebelumnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BackupPanel
          namaUsaha={tenant?.namaUsaha ?? DEFAULT_BRAND_NAME}
          isOwner={user.role === "owner"}
          snapshots={snapshots}
        />
      </CardContent>
    </Card>
  );
}
