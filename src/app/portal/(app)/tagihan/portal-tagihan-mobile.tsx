"use client";

import Link from "next/link";
import { FinanceBalanceHero } from "@/components/mobile/finance";
import { formatRupiah } from "@/lib/utils";

export function PortalTagihanMobileHero({
  primaryLabel,
  primaryAmount,
}: {
  primaryLabel: string;
  primaryAmount: number;
}) {
  return (
    <div className="fm-mobile-only -mx-4 -mt-4">
      <FinanceBalanceHero label={primaryLabel} amount={formatRupiah(primaryAmount)} />
    </div>
  );
}

export function PortalRiwayatSection({ children }: { children: React.ReactNode }) {
  return (
    <div id="riwayat" className="scroll-mt-24 space-y-2">
      <h2 className="text-sm font-semibold">Riwayat Pembayaran</h2>
      {children}
    </div>
  );
}

export function PortalTagihanMobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-primary underline">
      {children}
    </Link>
  );
}
