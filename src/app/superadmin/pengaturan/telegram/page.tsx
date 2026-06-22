import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { TelegramForm } from "../platform-forms";

export default async function TelegramPage() {
  const settings = await getPlatformSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grup Telegram</CardTitle>
        <CardDescription>
          Link grup komunitas atau support. Ditampilkan sebagai tombol di halaman Kontak.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TelegramForm defaults={settings} />
        <p className="mt-4 text-xs text-muted-foreground">
          Pratinjau:{" "}
          <a href="/kontak" target="_blank" rel="noopener noreferrer" className="underline">
            /kontak
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
