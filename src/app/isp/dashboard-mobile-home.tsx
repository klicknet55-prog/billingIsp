"use client";

import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Ticket,
  Users,
} from "lucide-react";
import {
  FinanceBalanceHero,
  FinanceBalanceHeroAction,
  FinancePageHero,
  FinanceQuickGrid,
  FinanceSummaryCard,
  FinanceUserAccountCard,
  type FinanceQuickItem,
  type FinanceUserSubscriptionInfo,
} from "@/components/mobile/finance";
import { formatRupiah } from "@/lib/utils";

export function DashboardMobileHome({
  userName,
  userRole,
  subscriptionInfo,
  showSubscriptionActions,
  pendapatan,
  totalBulanIni,
  totalTunggakan,
  totalPelanggan,
  isolir,
}: {
  userName: string;
  userRole: string;
  subscriptionInfo?: FinanceUserSubscriptionInfo | null;
  showSubscriptionActions?: boolean;
  pendapatan: number;
  totalBulanIni: number;
  totalTunggakan: number;
  totalPelanggan: number;
  isolir: number;
}) {
  const quickItems: FinanceQuickItem[] = [
    { id: "pelanggan", label: "Pelanggan", icon: Users, href: "/dashboard/pelanggan" },
    { id: "tagihan", label: "Tagihan", icon: CreditCard, href: "/dashboard/tagihan" },
    { id: "router", label: "Router", icon: LayoutDashboard, href: "/dashboard/router" },
    { id: "tiket", label: "Tiket", icon: Ticket, href: "/dashboard/tiket" },
    { id: "laporan", label: "Laporan", icon: BarChart3, href: "/dashboard/laporan" },
    { id: "integrasi", label: "Integrasi", icon: CreditCard, href: "/dashboard/integrasi" },
    { id: "pesan", label: "Pesan", icon: Ticket, href: "/dashboard/pesan" },
    { id: "menu", label: "Menu", icon: LayoutDashboard, href: "/dashboard/menu" },
  ];

  return (
    <div className="fm-mobile-only -mx-4 -mt-4 space-y-0">
      <FinancePageHero title="Dashboard" subtitle="Ringkasan operasional ISP Anda.">
        <FinanceUserAccountCard
          userName={userName}
          userRole={userRole}
          subscriptionInfo={subscriptionInfo}
          showSubscriptionActions={showSubscriptionActions}
        />
      </FinancePageHero>

      <FinanceBalanceHero
        label="Pendapatan Lunas"
        amount={formatRupiah(pendapatan)}
        secondaryAction={
          <FinanceBalanceHeroAction href="/dashboard/tagihan">Kelola Tagihan</FinanceBalanceHeroAction>
        }
      >
        <p className="mt-2 text-xs text-muted-foreground">
          {totalPelanggan} pelanggan · {isolir} terisolir
        </p>
      </FinanceBalanceHero>

      <FinanceQuickGrid title="Menu Cepat" items={quickItems} />

      <FinanceSummaryCard
        title="Catatan Keuangan"
        rows={[
          { label: "Tagihan bulan ini", amount: formatRupiah(totalBulanIni), variant: "income" },
          { label: "Tunggakan", amount: formatRupiah(totalTunggakan), variant: "expense" },
          {
            label: "Selisih estimasi",
            amount: formatRupiah(Math.max(0, totalBulanIni - totalTunggakan)),
            variant: "neutral",
          },
        ]}
      />
    </div>
  );
}
