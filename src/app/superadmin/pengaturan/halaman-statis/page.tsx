import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { formatDate } from "@/lib/utils";
import { StaticPagesForm } from "../static-pages-form";

export default async function HalamanStatisPage() {
  const settings = await getPlatformSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Halaman Statis</CardTitle>
        <CardDescription>
          Kelola halaman publik Tentang, Kontak, Syarat & Ketentuan, serta halaman Community
          internal. Konten ditampilkan di footer situs dan dashboard. Terakhir diperbarui:{" "}
          {formatDate(settings.updatedAt)}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StaticPagesForm defaults={settings} />
      </CardContent>
    </Card>
  );
}
