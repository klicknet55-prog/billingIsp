import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { ProfilAppForm } from "../platform-forms";

export default async function ProfilAppPage() {
  const settings = await getPlatformSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil App</CardTitle>
        <CardDescription>
          Nama brand dan tagline yang tampil di homepage, title browser, dan footer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfilAppForm defaults={settings} />
      </CardContent>
    </Card>
  );
}
