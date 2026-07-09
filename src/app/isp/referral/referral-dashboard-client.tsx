"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReferralDashboard } from "@/features/referrals/service";
import { formatDate } from "@/lib/utils";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Tersalin" : label}
    </Button>
  );
}

function statusLabel(status: string, refereeStatus?: string) {
  if (status === "rewarded") return { label: "Bonus diberikan", variant: "default" as const };
  if (status === "pending") {
    if (refereeStatus === "suspended") {
      return { label: "Menunggu pembayaran", variant: "secondary" as const };
    }
    return { label: "Memproses bonus", variant: "secondary" as const };
  }
  return { label: "Ditolak", variant: "destructive" as const };
}

export function ReferralDashboardClient({ data }: { data: ReferralDashboard }) {
  return (
    <div className="space-y-6">
      {!data.enabled && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200">
            Program referral belum diaktifkan oleh platform. Kode Anda tetap bisa dibagikan, tetapi
            bonus belum diberikan sampai superadmin mengaktifkannya.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Referral sukses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.successCount}</p>
            <p className="text-xs text-muted-foreground">dari maks. {data.maxPerTenant}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sisa kuota</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.remainingQuota}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total hari bonus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalRewardDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bonus per referral</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">+{data.rewardDays} hari</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bagikan kode Anda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Setiap ISP baru yang mendaftar lewat link atau kode Anda memperpanjang langganan Anda
            sebanyak {data.rewardDays} hari setelah pendaftaran selesai (pembayaran lunas untuk paket
            berbayar).
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="rounded-md border bg-muted px-3 py-2 text-sm font-semibold">
              {data.code}
            </code>
            <CopyButton value={data.code} label="Salin kode" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="break-all rounded-md border bg-muted px-3 py-2 text-xs">{data.link}</code>
            <CopyButton value={data.link} label="Salin link" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant yang berhasil daftar</CardTitle>
        </CardHeader>
        <CardContent>
          {data.referredTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada ISP yang mendaftar lewat kode Anda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama usaha</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Tanggal daftar</TableHead>
                  <TableHead>Status bonus</TableHead>
                  <TableHead className="text-right">Hari bonus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referredTenants.map((row) => {
                  const status = statusLabel(row.status, row.refereeStatus);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.namaUsaha}</TableCell>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{row.packageName}</TableCell>
                      <TableCell>{formatDate(row.registeredAt)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.status === "rewarded" ? `+${row.rewardDays}` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
