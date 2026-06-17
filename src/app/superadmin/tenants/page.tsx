import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteTenantAction, setTenantStatusAction } from "@/features/tenants/actions";
import { listTenants } from "@/features/tenants/service";
import { formatDate } from "@/lib/utils";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const tenants = await listTenants();

  return (
    <>
      <PageHeader title="Manajemen Tenant" description="Aktifkan atau nonaktifkan akun ISP." />
      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Usaha</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.namaUsaha}</TableCell>
                  <TableCell className="text-muted-foreground">{t.domain}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "active" ? "success" : "destructive"}>
                      {t.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <form action={setTenantStatusAction} className="inline">
                        <input type="hidden" name="id" value={t.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={t.status === "active" ? "suspended" : "active"}
                        />
                        <Button
                          variant={t.status === "active" ? "outline" : "default"}
                          size="sm"
                          type="submit"
                        >
                          {t.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </form>
                      {t.status !== "active" && (
                        <form action={deleteTenantAction} className="inline">
                          <input type="hidden" name="id" value={t.id} />
                          <Button variant="destructive" size="sm" type="submit">
                            Hapus
                          </Button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada tenant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
