import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSalesDashboard, basisPointsToPercent } from "@/features/sales/service";
import { requestSalesCommissionPayoutAction } from "@/features/sales/actions";
import { requireUser } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function SalesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser(["sales"]);
  const [dashboard, query] = await Promise.all([getSalesDashboard(user.id), searchParams]);
  const error = query.error ? decodeURIComponent(query.error) : "";
  const success = query.success ? decodeURIComponent(query.success) : "";
  const referralUrl = `/register-tenant?sales=${encodeURIComponent(
    dashboard.profile.referralCode
  )}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Halo, ${user.nama}`}
        description="Pantau tenant, transaksi, dan komisi yang terhubung ke akun Anda."
      />
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {success && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3 text-sm text-emerald-700 dark:text-emerald-400">
            {success}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Kode referral Anda</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-bold">{dashboard.profile.referralCode}</p>
          <a className="mt-2 inline-block break-all text-sm text-primary underline" href={referralUrl}>
            {referralUrl}
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            Fee saat ini: {basisPointsToPercent(dashboard.profile.commissionRateBps)}% dari
            pembayaran langganan SaaS sukses.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Tenant teratribusi</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dashboard.tenants.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Komisi dapat dicairkan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold">{formatRupiah(dashboard.payableAmount)}</p>
            <p className="text-xs text-muted-foreground">
              Saldo ini merupakan total komisi tersedia dari transaksi sukses. Permintaan yang
              menunggu atau sudah disetujui tidak dapat diajukan ulang.
            </p>
            <form action={requestSalesCommissionPayoutAction} className="space-y-3">
              <Input
                name="payoutMethod"
                placeholder="Bank atau e-wallet"
                required
                minLength={2}
                maxLength={60}
                aria-label="Bank atau e-wallet tujuan pencairan"
              />
              <Input
                name="accountName"
                placeholder="Nama pemilik rekening"
                required
                minLength={2}
                maxLength={120}
                aria-label="Nama pemilik rekening"
              />
              <Input
                name="accountNumber"
                placeholder="Nomor rekening atau e-wallet"
                required
                minLength={4}
                maxLength={80}
                aria-label="Nomor rekening atau e-wallet"
              />
              <Button type="submit" disabled={dashboard.payableAmount <= 0}>
                Ajukan penarikan saldo
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Komisi sudah dicairkan</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatRupiah(dashboard.paidAmount)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant saya</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama tenant</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atribusi</TableHead>
                <TableHead>Terdaftar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.namaUsaha}</TableCell>
                  <TableCell>{tenant.domain}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === "active" ? "success" : "destructive"}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{tenant.source === "manual" ? "Manual" : "Kode referral"}</TableCell>
                  <TableCell>{formatDate(tenant.attributedAt)}</TableCell>
                </TableRow>
              ))}
              {dashboard.tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada tenant terhubung ke akun Anda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat permintaan pencairan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Status / referensi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.payoutRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{formatDate(request.requestedAt)}</TableCell>
                  <TableCell className="font-medium">{formatRupiah(request.amount)}</TableCell>
                  <TableCell>
                    <div>{request.payoutMethod}</div>
                    <div className="text-xs text-muted-foreground">
                      {request.accountName} · {request.accountNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === "paid"
                          ? "success"
                          : request.status === "requested" || request.status === "approved"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {request.status === "requested"
                        ? "Menunggu persetujuan"
                        : request.status === "approved"
                          ? "Disetujui - menunggu transfer"
                          : request.status === "paid"
                            ? "Sudah dibayar"
                            : "Ditolak"}
                    </Badge>
                    {request.payoutReference && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ref: {request.payoutReference}
                      </p>
                    )}
                    {request.rejectionReason && (
                      <p className="mt-1 text-xs text-destructive">{request.rejectionReason}</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {dashboard.payoutRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Belum ada permintaan pencairan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Komisi saya</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Dasar × fee</TableHead>
                <TableHead>Komisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Referensi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.commissions.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.createdAt)}</TableCell>
                  <TableCell>{entry.tenantName}</TableCell>
                  <TableCell>
                    {formatRupiah(entry.baseAmount)} ×{" "}
                    {basisPointsToPercent(entry.commissionRateBps)}%
                  </TableCell>
                  <TableCell className="font-medium">{formatRupiah(entry.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.status === "paid"
                          ? "success"
                          : entry.payoutRequestStatus === "requested" ||
                              entry.payoutRequestStatus === "approved" ||
                              entry.status === "payable"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {entry.payoutRequestStatus === "requested"
                        ? "Dalam permintaan penarikan"
                        : entry.payoutRequestStatus === "approved"
                          ? "Disetujui untuk penarikan"
                        : entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {entry.payoutReference || entry.reason || entry.entryType}
                  </TableCell>
                </TableRow>
              ))}
              {dashboard.commissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada komisi tercatat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
