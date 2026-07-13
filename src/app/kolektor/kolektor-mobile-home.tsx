"use client";

import { HandCoins, Heart, ListChecks, MapPin, User, Wallet } from "lucide-react";
import {
  FinanceBalanceHero,
  FinanceBalanceHeroAction,
  FinanceQuickGrid,
  FinanceSummaryCard,
  type FinanceQuickItem,
} from "@/components/mobile/finance";
import { formatRupiah } from "@/lib/utils";

export function KolektorMobileHome({
  totalTunggakan,
  taskCount,
  bulanIniTotal,
  terkumpulEstimate,
}: {
  totalTunggakan: number;
  taskCount: number;
  bulanIniTotal: number;
  terkumpulEstimate: number;
}) {
  const quickItems: FinanceQuickItem[] = [
    {
      id: "navigasi",
      label: "Navigasi",
      icon: MapPin,
      onClick: () => window.dispatchEvent(new CustomEvent("nm-kolektor-navigate")),
    },
    {
      id: "tugas",
      label: "Tugas",
      icon: ListChecks,
      href: "#tugas-kolektor",
    },
    {
      id: "bayar",
      label: "Catat Bayar",
      icon: Wallet,
      href: "#tugas-kolektor",
    },
    { id: "profil", label: "Profil", icon: User, href: "/kolektor/profil" },
    { id: "community", label: "Community", icon: HandCoins, href: "/kolektor/community" },
    { id: "kontributor", label: "Kontributor", icon: Heart, href: "/kolektor/kontributor" },
  ];

  return (
    <div className="fm-mobile-only -mx-4 -mt-4 space-y-0">
      <FinanceBalanceHero
        label="Total Tunggakan Area"
        amount={formatRupiah(totalTunggakan)}
        secondaryAction={
          taskCount > 0 ? (
            <FinanceBalanceHeroAction href="#tugas-kolektor">
              Lihat {taskCount} tugas
            </FinanceBalanceHeroAction>
          ) : undefined
        }
      >
        <p className="mt-2 text-xs text-muted-foreground">
          {taskCount} pelanggan belum lunas · Tap Nav di bawah untuk rute terdekat
        </p>
      </FinanceBalanceHero>

      <FinanceQuickGrid title="Aksi Cepat" items={quickItems} />

      <FinanceSummaryCard
        title="Ringkasan Penagihan"
        rows={[
          { label: "Tagihan bulan ini", amount: formatRupiah(bulanIniTotal), variant: "income" },
          { label: "Total tunggakan", amount: formatRupiah(totalTunggakan), variant: "expense" },
          {
            label: "Estimasi terkumpul",
            amount: formatRupiah(terkumpulEstimate),
            variant: "neutral",
          },
        ]}
      />
    </div>
  );
}
