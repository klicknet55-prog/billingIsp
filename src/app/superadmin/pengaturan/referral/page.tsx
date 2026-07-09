import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { ReferralForm } from "../platform-forms";

export default async function ReferralSettingsPage() {
  const settings = await getPlatformSettings();

  return (
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
  );
}
