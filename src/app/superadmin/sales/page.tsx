import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  assignTenantToSalesAction,
  createSalesAccountAction,
  paySalesCommissionPayoutRequestAction,
  reverseSalesCommissionAction,
  reviewSalesCommissionPayoutRequestAction,
  rotateSalesReferralCodeAction,
  updateSalesProfileAction,
} from "@/features/sales/actions";
import {
  basisPointsToPercent,
  listActiveSalesProfiles,
  listRecentSalesAttributionAudits,
  listSalesCommissions,
  listSalesCommissionPayoutRequests,
  listSalesProfiles,
  listTenantSalesAssignmentOptions,
  listTenantSalesAttributions,
} from "@/features/sales/service";
import { formatDate, formatRupiah } from "@/lib/utils";

export default async function SalesManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [query, profiles, activeSales, tenantOptions, attributions, audits, payoutRequests, commissions] =
    await Promise.all([
      searchParams,
      listSalesProfiles(),
      listActiveSalesProfiles(),
      listTenantSalesAssignmentOptions(),
      listTenantSalesAttributions(),
      listRecentSalesAttributionAudits(),
      listSalesCommissionPayoutRequests(),
      listSalesCommissions(),
    ]);
  const error = query.error ? decodeURIComponent(query.error) : "";
  const success = query.success ? decodeURIComponent(query.success) : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tim Sales"
        description="Kelola akun, kode referral, fee, atribusi tenant, serta ledger komisi."
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
          <CardTitle>Tambah akun sales</CardTitle>
          <CardDescription>
            Akun dapat login ke portal Sales dan menerima kode referral unik.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSalesAccountAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input name="nama" placeholder="Nama sales" required maxLength={120} />
            <Input name="email" type="email" placeholder="Email login" required maxLength={254} />
            <Input
              name="password"
              type="password"
              placeholder="Kata sandi (min. 8 karakter)"
              required
              minLength={8}
              maxLength={128}
            />
            <div className="flex items-center gap-2">
              <Input
                name="feePercent"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue="10"
                required
                aria-label="Fee komisi persen"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Button type="submit">Buat akun</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Akun dan kode referral</CardTitle>
          <CardDescription>
            Fee baru berlaku untuk transaksi yang dibuat setelah tarif diubah. Snapshot transaksi
            lama tidak berubah.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales</TableHead>
                <TableHead>Kode / tautan daftar</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.userId}>
                  <TableCell>
                    <div className="font-medium">{profile.nama}</div>
                    <div className="text-xs text-muted-foreground">{profile.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">{profile.referralCode}</div>
                    <a
                      className="text-xs text-primary underline"
                      href={`/register-tenant?sales=${encodeURIComponent(profile.referralCode)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buka tautan pendaftaran
                    </a>
                  </TableCell>
                  <TableCell>
                    <form
                      action={updateSalesProfileAction}
                      className="flex max-w-48 items-center gap-2"
                    >
                      <input type="hidden" name="salesUserId" value={profile.userId} />
                      <Input
                        name="feePercent"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        defaultValue={basisPointsToPercent(profile.commissionRateBps)}
                        aria-label={`Fee ${profile.nama}`}
                      />
                      <span className="text-sm">%</span>
                      <label className="sr-only" htmlFor={`active-${profile.userId}`}>
                        Status aktif
                      </label>
                      <input
                        id={`active-${profile.userId}`}
                        type="checkbox"
                        name="isActive"
                        defaultChecked={profile.isActive && profile.isUserActive}
                        aria-label={`Aktifkan ${profile.nama}`}
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Simpan
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        profile.isActive && profile.isUserActive ? "success" : "destructive"
                      }
                    >
                      {profile.isActive && profile.isUserActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <form action={rotateSalesReferralCodeAction}>
                      <input type="hidden" name="salesUserId" value={profile.userId} />
                      <Button type="submit" size="sm" variant="outline">
                        Ganti kode
                      </Button>
                    </form>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Dibuat {formatDate(profile.createdAt)}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
              {profiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada akun sales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atribusi tenant manual</CardTitle>
          <CardDescription>
            Perubahan atribusi hanya memengaruhi transaksi berikutnya. Komisi lama tetap pada sales
            yang menerima atribusi saat transaksi dibuat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={assignTenantToSalesAction} className="grid gap-3 sm:grid-cols-4">
            <select
              name="tenantId"
              required
              defaultValue=""
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="" disabled>
                Pilih tenant
              </option>
              {tenantOptions.map((tenant) => (
                <option key={tenant.tenantId} value={tenant.tenantId}>
                  {tenant.tenantName} ({tenant.domain})
                </option>
              ))}
            </select>
            <select
              name="salesUserId"
              required
              defaultValue=""
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="" disabled>
                Pilih sales aktif
              </option>
              {activeSales.map((sales) => (
                <option key={sales.userId} value={sales.userId}>
                  {sales.nama} · {sales.referralCode}
                </option>
              ))}
            </select>
            <Input
              name="reason"
              placeholder="Alasan atribusi (min. 5 karakter)"
              required
              minLength={5}
              maxLength={500}
            />
            <Button type="submit" disabled={!activeSales.length || !tenantOptions.length}>
              Simpan atribusi
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-4">
              <input type="checkbox" name="confirm" required />
              Saya mengonfirmasi atribusi/perubahan sales; perubahan akan masuk audit.
            </label>
          </form>
          <p className="text-xs text-muted-foreground">
            Daftar tenant dan tabel menampilkan maksimal 500 data terbaru/pertama.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant teratribusi ({attributions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Tanggal atribusi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attributions.map((row) => (
                <TableRow key={row.tenantId}>
                  <TableCell>
                    <div className="font-medium">{row.tenantName}</div>
                    <div className="text-xs text-muted-foreground">{row.domain}</div>
                  </TableCell>
                  <TableCell>
                    <div>{row.salesName}</div>
                    <div className="text-xs text-muted-foreground">{row.salesEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.source === "manual" ? "secondary" : "outline"}>
                      {row.source === "manual" ? "Manual" : "Kode referral"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(row.attributedAt)}</TableCell>
                </TableRow>
              ))}
              {attributions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Belum ada tenant yang diatribusikan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permintaan pencairan komisi</CardTitle>
          <CardDescription>
            Setujui permintaan sales terlebih dahulu. Lakukan transfer, lalu catat referensi
            pembayaran untuk menyelesaikan pencairan gabungan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Tujuan transfer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium">{request.salesName}</div>
                    <div className="text-xs text-muted-foreground">{request.salesEmail}</div>
                  </TableCell>
                  <TableCell className="font-semibold">{formatRupiah(request.amount)}</TableCell>
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
                    {request.rejectionReason && (
                      <p className="mt-1 max-w-48 text-xs text-muted-foreground">
                        {request.rejectionReason}
                      </p>
                    )}
                    {request.payoutReference && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ref: {request.payoutReference}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(request.requestedAt)}</TableCell>
                  <TableCell>
                    {(request.status === "requested" || request.status === "approved") && (
                      <div className="space-y-2">
                        {request.status === "requested" && (
                          <form action={reviewSalesCommissionPayoutRequestAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="decision" value="approve" />
                            <Button type="submit" size="sm">
                              Setujui
                            </Button>
                          </form>
                        )}
                        <form
                          action={reviewSalesCommissionPayoutRequestAction}
                          className="flex flex-col gap-1"
                        >
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <Input
                            name="rejectionReason"
                            required
                            minLength={5}
                            maxLength={500}
                            placeholder="Alasan penolakan"
                            aria-label={`Alasan menolak permintaan ${request.salesName}`}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Tolak
                          </Button>
                        </form>
                      </div>
                    )}
                    {request.status === "approved" && (
                      <form action={paySalesCommissionPayoutRequestAction} className="flex gap-1">
                        <input type="hidden" name="requestId" value={request.id} />
                        <Input
                          name="payoutReference"
                          required
                          maxLength={160}
                          placeholder="Referensi transfer"
                          aria-label={`Referensi transfer ${request.salesName}`}
                        />
                        <Button type="submit" size="sm">
                          Tandai dibayar
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payoutRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
          <CardTitle>Ledger komisi</CardTitle>
          <CardDescription>
            Pembayaran dicatat melalui permintaan pencairan gabungan; pembalikan setelah dibayar
            menghasilkan penyesuaian negatif untuk pencairan selanjutnya.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sales / tenant</TableHead>
                <TableHead>Dasar × fee</TableHead>
                <TableHead>Komisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Referensi / alasan</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium">{entry.salesName}</div>
                    <div className="text-xs text-muted-foreground">{entry.tenantName}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatRupiah(entry.baseAmount)} ×{" "}
                    {basisPointsToPercent(entry.commissionRateBps)}%
                    <div className="text-xs text-muted-foreground">
                      {entry.paymentGatewayLogId ?? entry.entryType}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatRupiah(entry.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.status === "paid"
                          ? "success"
                          : entry.payoutRequestStatus === "requested" ||
                              entry.payoutRequestStatus === "approved"
                            ? "warning"
                            : entry.status === "payable"
                            ? "warning"
                            : "outline"
                      }
                    >
                      {entry.payoutRequestStatus === "requested"
                        ? "Menunggu persetujuan"
                        : entry.payoutRequestStatus === "approved"
                          ? "Menunggu transfer"
                        : entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {entry.payoutReference || entry.reason || formatDate(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    {entry.status === "payable" && !entry.payoutRequestId ? (
                      <div>
                        {entry.entryType === "commission" && (
                          <form action={reverseSalesCommissionAction} className="flex gap-1">
                            <input type="hidden" name="commissionId" value={entry.id} />
                            <Input
                              name="reason"
                              required
                              minLength={5}
                              placeholder="Alasan refund"
                              aria-label="Alasan pembalikan komisi"
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Balik
                            </Button>
                          </form>
                        )}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {commissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada komisi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit perubahan atribusi (100 terbaru)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Sales sebelumnya</TableHead>
                <TableHead>Sales baru</TableHead>
                <TableHead>Sumber / alasan</TableHead>
                <TableHead>Waktu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((audit) => (
                <TableRow key={audit.id}>
                  <TableCell>{audit.tenantName}</TableCell>
                  <TableCell>{audit.previousSalesName ?? "—"}</TableCell>
                  <TableCell>{audit.nextSalesName ?? "—"}</TableCell>
                  <TableCell>
                    {audit.source}
                    {audit.reason ? ` · ${audit.reason}` : ""}
                  </TableCell>
                  <TableCell>{formatDate(audit.createdAt)}</TableCell>
                </TableRow>
              ))}
              {audits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada perubahan atribusi.
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
