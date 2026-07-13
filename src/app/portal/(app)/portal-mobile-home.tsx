"use client";

import {
  Activity,
  CreditCard,
  FileText,
  MessageSquareWarning,
  MoreHorizontal,
  Package,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  FinanceBalanceHero,
  FinanceBalanceHeroAction,
  FinanceHorizontalCards,
  FinanceQuickGrid,
  FinanceSummaryCard,
  type FinanceQuickItem,
} from "@/components/mobile/finance";
import { formatRupiah } from "@/lib/utils";

export function PortalMobileHome({
  nama,
  paketNama,
  paketKecepatan,
  jatuhTempo,
  isIsolated,
  bulanIniAmount,
  tunggakanTotal,
  hasBulanIni,
  hasTunggakan,
  tunggakanCount,
  totalPaid,
  onlinePayEnabled,
}: {
  nama: string;
  paketNama: string;
  paketKecepatan?: string | null;
  jatuhTempo: string;
  isIsolated: boolean;
  bulanIniAmount: number;
  tunggakanTotal: number;
  hasBulanIni: boolean;
  hasTunggakan: boolean;
  tunggakanCount: number;
  totalPaid: number;
  onlinePayEnabled: boolean;
}) {
  const primaryAmount =
    hasTunggakan && tunggakanTotal > 0
      ? tunggakanTotal + (hasBulanIni ? bulanIniAmount : 0)
      : hasBulanIni
        ? bulanIniAmount
        : 0;

  const quickItems: FinanceQuickItem[] = [
    { id: "bayar", label: "Bayar", icon: CreditCard, href: "/portal/tagihan" },
    { id: "tagihan", label: "Tagihan", icon: FileText, href: "/portal/tagihan" },
    { id: "lapor", label: "Lapor", icon: MessageSquareWarning, href: "/portal/lapor" },
    { id: "diagnostik", label: "Diagnostik", icon: Activity, href: "/portal/diagnostik" },
    { id: "riwayat", label: "Riwayat", icon: FileText, href: "/portal/tagihan#riwayat" },
    { id: "paket", label: "Paket", icon: Package, href: "/portal" },
    { id: "akun", label: "Akun", icon: User, href: "/portal/akun" },
    { id: "lainnya", label: "Lainnya", icon: MoreHorizontal, href: "/portal/akun" },
  ];

  return (
    <div className="fm-mobile-only -mx-4 -mt-4 space-y-0">
      <FinanceBalanceHero
        label="Total Tagihan Aktif"
        amount={formatRupiah(primaryAmount)}
        secondaryAction={
          hasBulanIni || hasTunggakan ? (
            <FinanceBalanceHeroAction href="/portal/tagihan">Bayar Sekarang</FinanceBalanceHeroAction>
          ) : undefined
        }
      >
        <p className="mt-2 text-xs text-muted-foreground">
          Paket {paketNama}
          {paketKecepatan ? ` · ${paketKecepatan}` : ""} · Jatuh tempo {jatuhTempo}
          {isIsolated ? " · Terisolir" : ""}
        </p>
      </FinanceBalanceHero>

      <FinanceQuickGrid items={quickItems} />

      {onlinePayEnabled && (
        <FinanceHorizontalCards
          title="Bayar Online"
          items={[
            {
              id: "qris",
              title: "QRIS / Virtual Account",
              subtitle: "Pembayaran instan via gateway",
              actionLabel: "Bayar tagihan →",
              href: "/portal/tagihan",
            },
          ]}
        />
      )}

      <FinanceSummaryCard
        title="Catatan Keuangan"
        rows={[
          {
            label: "Sudah dibayar",
            amount: formatRupiah(totalPaid),
            variant: "income",
          },
          {
            label: "Tunggakan",
            amount: formatRupiah(tunggakanTotal),
            variant: "expense",
          },
          {
            label: "Tagihan bulan ini",
            amount: hasBulanIni ? formatRupiah(bulanIniAmount) : "Rp 0",
            variant: "neutral",
          },
        ]}
        footer={`Halo, ${nama}`}
      />

      <div className="px-4 pb-4">
        <Link
          href="/portal/lapor"
          className="fm-surface-card block bg-card p-4 text-sm font-medium text-primary"
        >
          Butuh bantuan? Laporkan gangguan →
        </Link>
      </div>
    </div>
  );
}
