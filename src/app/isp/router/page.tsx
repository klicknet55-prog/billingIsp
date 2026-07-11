import { unstable_noStore as noStore } from "next/cache";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { TunnelhostServiceLinks } from "@/components/integrations/tunnelhost-service-links";
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
import {
  deleteRouterAction,
  refreshRouterAction,
} from "@/features/routers/actions";
import { listRouters } from "@/features/routers/service";
import { getTenantQuotaSnapshot } from "@/features/tenants/service";
import { requireUser } from "@/lib/auth";
import { RouterCreateDialog, RouterFormDialog } from "./router-form-dialog";

export const dynamic = "force-dynamic";

export default async function RouterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; warn?: string; routerId?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const success = qs.success ? decodeURIComponent(qs.success) : "";
  const warn = qs.warn ? decodeURIComponent(qs.warn) : "";
  const routerId = qs.routerId ? decodeURIComponent(qs.routerId) : "";
  noStore();
  const user = await requireUser(["owner", "admin", "teknisi"]);
  const [rows, quota] = await Promise.all([
    listRouters(user.tenantId!),
    getTenantQuotaSnapshot(user.tenantId!),
  ]);
  const routerQuotaText = quota
    ? `${quota.totalRouter}/${quota.maxRouter ?? "∞"}`
    : `${rows.length}/-`;

  const errorLower = error.toLowerCase();
  const showPelangganLink =
    routerId && (errorLower.includes("pelanggan") || errorLower.includes("data lain"));
  const showOdpLink = errorLower.includes("odp") || errorLower.includes("sumber input");
  const showPaketLink = errorLower.includes("paket");

  return (
    <>
      <PageHeader
        title="Router Mikrotik"
        description={`Kelola perangkat. Kuota: ${routerQuotaText}${
          quota ? ` (Paket ${quota.paketNama})` : ""
        }`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TunnelhostServiceLinks />
            {(user.role === "owner" || user.role === "admin") && (
              <>
                <Button asChild size="sm" className="md:hidden">
                  <Link href="/dashboard/router/tambah">
                    <Plus />
                    Tambah Router
                  </Link>
                </Button>
                <div className="hidden md:contents">
                  <RouterCreateDialog />
                </div>
              </>
            )}
          </div>
        }
      />

      {success && (
        <Card className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</CardContent>
        </Card>
      )}
      {warn && (
        <Card className="mb-4 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-sm text-amber-800 dark:text-amber-300">{warn}</CardContent>
        </Card>
      )}
      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <span className="text-destructive">{error}</span>
            <div className="flex flex-wrap gap-2">
              {showPelangganLink && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/pelanggan?routerId=${encodeURIComponent(routerId)}`}>
                    Lihat Pelanggan Terkait
                  </Link>
                </Button>
              )}
              {showOdpLink && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/peta?tab=odp">Lihat ODP di Peta</Link>
                </Button>
              )}
              {showPaketLink && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/paket">Lihat Paket Internet</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">IP</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {r.ipAddress}:{r.apiPort}
                  </TableCell>
                  <TableCell className="uppercase">{r.connectionMode === "rest" ? "REST" : "LEGACY"}</TableCell>
                  <TableCell>
                    <Badge variant={r.isOnline ? "success" : "destructive"}>
                      {r.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <RouterFormDialog
                        router={r}
                        trigger={
                          <Button variant="ghost" size="icon" title="Edit">
                            <Pencil />
                          </Button>
                        }
                      />
                      <form action={refreshRouterAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button variant="ghost" size="icon" title="Cek status" type="submit">
                          <RefreshCw />
                        </Button>
                      </form>
                      <form action={deleteRouterAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          Hapus
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada router.
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
