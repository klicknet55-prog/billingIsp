import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { PemilikForm } from "../platform-forms";

export default async function PemilikPage() {
  const settings = await getPlatformSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pemilik</CardTitle>
        <CardDescription>
          Data pemilik atau entitas legal platform (bisa ditampilkan di halaman Kontak).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PemilikForm defaults={settings} />
      </CardContent>
    </Card>
  );
}
