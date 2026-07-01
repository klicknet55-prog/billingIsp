import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listKolektors,
  listPelangganAssignments,
} from "@/features/kolektor-assignments/service";
import { requireUser } from "@/lib/auth";
import { KolektorAssignmentForm } from "./assignment-form";

export default async function KolektorPelangganPage() {
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const [kolektors, pelanggan] = await Promise.all([
    listKolektors(tenantId),
    listPelangganAssignments(tenantId),
  ]);

  return (
    <>
      <PageHeader title="Area Kolektor" />
      <Card>
        <CardHeader>
          <CardTitle>Penugasan Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          <KolektorAssignmentForm kolektors={kolektors} pelanggan={pelanggan} />
        </CardContent>
      </Card>
    </>
  );
}
