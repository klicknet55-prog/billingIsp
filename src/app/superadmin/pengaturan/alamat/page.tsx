import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { AlamatForm } from "../platform-forms";

export default async function AlamatPage() {
  const settings = await getPlatformSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alamat</CardTitle>
        <CardDescription>
          Alamat kantor atau operasional platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlamatForm defaults={settings} />
      </CardContent>
    </Card>
  );
}
