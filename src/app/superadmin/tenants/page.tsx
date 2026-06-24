import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteTenantAction,
  extendTenantSubscriptionAction,
  setTenantStatusAction,
} from "@/features/tenants/actions";
import { listTenantsWithSubscription } from "@/features/tenants/service";
import { formatDate } from "@/lib/utils";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const success = qs.success ? decodeURIComponent(qs.success) : "";
  const rows = await listTenantsWithSubscription();

  return (
    <>
      <PageHeader title="Manajemen Tenant" description="Aktifkan, tangguhkan, dan perpanjang langganan ISP." />
      {success && (
        <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</CardContent>
        </Card>
      )}
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
                <TableHead>Paket</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ tenant: t, subscription: sub }) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.namaUsaha}</TableCell>
                  <TableCell className="text-muted-foreground">{t.domain}</TableCell>
                  <TableCell className="text-muted-foreground">{sub?.packageName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub ? formatDate(sub.akhir) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={t.status === "active" ? "success" : "destructive"}>
                        Tenant {t.status === "active" ? "Aktif" : "Suspend"}
                      </Badge>
                      {sub && (
                        <Badge variant={sub.status === "active" ? "success" : "destructive"}>
                          Langganan {sub.status === "active" ? "Aktif" : "Expired"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-col items-end gap-2">
                      <form action={extendTenantSubscriptionAction} className="flex items-center gap-2">
                        <input type="hidden" name="tenantId" value={t.id} />
                        <Input
                          name="days"
                          type="number"
                          min={1}
                          defaultValue={30}
                          className="h-8 w-20"
                          aria-label="Hari perpanjangan"
                        />
                        <Button variant="secondary" size="sm" type="submit">
                          Perpanjang
                        </Button>
                      </form>
                      <div className="flex items-center gap-2">
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
                            {t.status === "active" ? "Suspend" : "Aktifkan"}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada tenant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Perpanjang menambah hari dari tanggal berakhir (atau hari ini jika sudah lewat), mengaktifkan
        kembali tenant dan langganan. Reminder H-7/H-1 otomatis via{" "}
        <Link href="/api/cron" className="underline">
          cron
        </Link>
        .
      </p>
    </>
  );
}
