import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFreeRenewalDonationAction } from "@/features/saas-renewal/actions";
import { MIN_DONATION_AMOUNT } from "@/lib/donation/constants";

export function FreeRenewalCard({
  extensionDays,
  donationConfigured,
}: {
  extensionDays: number;
  donationConfigured: boolean;
}) {
  const minLabel = MIN_DONATION_AMOUNT.toLocaleString("id-ID");

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Perpanjang via Donasi</CardTitle>
        <CardDescription>
          Paket Free dapat diperpanjang dengan donasi nominal bebas (minimal Rp {minLabel}) untuk
          tambahan <strong>{extensionDays} hari</strong> langganan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!donationConfigured ? (
          <p className="text-sm text-muted-foreground">
            Pembayaran donasi belum dikonfigurasi di server platform. Hubungi administrator.
          </p>
        ) : (
          <form
            action={createFreeRenewalDonationAction}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="renewalAmount">Nominal donasi (Rp)</Label>
              <Input
                id="renewalAmount"
                name="amount"
                type="number"
                min={MIN_DONATION_AMOUNT}
                step={1}
                required
                placeholder={String(MIN_DONATION_AMOUNT)}
              />
            </div>
            <Button type="submit" className="shrink-0">
              Bayar Donasi & Perpanjang
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
