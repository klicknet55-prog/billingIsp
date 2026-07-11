import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { ReferralForm, FreeRenewalForm } from "../platform-forms";

export default async function ReferralSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Program Referral</CardTitle>
          <CardDescription>
            Pengundang (tenant existing) mendapat perpanjangan langganan saat ISP baru mendaftar
            dengan kode referral mereka.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralForm defaults={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perpanjang Paket Free via Donasi</CardTitle>
          <CardDescription>
            Tenant paket Free yang suspended dapat memperpanjang langganan dengan donasi nominal
            bebas (minimal Rp 1.000) melalui Duitku platform. Jumlah hari perpanjangan diatur di
            bawah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FreeRenewalForm defaults={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
