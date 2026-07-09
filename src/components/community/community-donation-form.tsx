"use client";

import Link from "next/link";
import { HandCoins, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { donateCommunityAction } from "@/features/community-donation/actions";
import { MIN_COMMUNITY_DONATION } from "@/features/community-donation/constants";

export function CommunityDonationForm({
  canDonate,
  donationEnabled,
  kontributorHref,
  returnTo,
  errorMessage,
}: {
  canDonate: boolean;
  donationEnabled: boolean;
  kontributorHref: string;
  returnTo: string;
  errorMessage?: string | null;
}) {
  const minLabel = MIN_COMMUNITY_DONATION.toLocaleString("id-ID");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Dukung pengembangan platform komunitas. Nominal bebas, minimal Rp {minLabel}.
      </p>

      {!donationEnabled && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          Pembayaran donasi belum dikonfigurasi di server (Duitku platform).
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {canDonate && donationEnabled ? (
        <form action={donateCommunityAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="flex-1 space-y-2">
            <Label htmlFor="donationAmount">Nominal donasi (Rp)</Label>
            <Input
              id="donationAmount"
              name="amount"
              type="number"
              min={MIN_COMMUNITY_DONATION}
              step={1000}
              required
              placeholder={String(MIN_COMMUNITY_DONATION)}
            />
          </div>
          <Button type="submit" className="shrink-0">
            <HandCoins className="mr-1 h-4 w-4" />
            Donasi sekarang
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {canDonate
            ? "Donasi sementara tidak tersedia."
            : "Hanya staff ISP (owner, admin, kolektor, teknisi) yang dapat berdonasi dari akun tenant."}
        </p>
      )}

      <Button asChild variant="outline" size="sm">
        <Link href={kontributorHref}>
          <Users className="mr-1 h-4 w-4" />
          Lihat daftar kontributor
        </Link>
      </Button>
    </div>
  );
}
