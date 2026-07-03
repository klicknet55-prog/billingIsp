import { Download, HandCoins, MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apkDisplayLabelFromUrl } from "@/lib/mobile/apk-filename";
import { MOBILE_APP_NAMES } from "@/lib/mobile/app-names";
import type { PlatformSettings } from "@/lib/db/schema";
import { whatsappUrl } from "@/features/platform-settings/whatsapp";

export function CommunityPageContent({
  settings,
}: {
  settings: Pick<
    PlatformSettings,
    | "communityDescription"
    | "communityDonationImageUrl"
    | "communityApkAdminUrl"
    | "communityApkPortalUrl"
    | "communityWhatsappSuperadmin"
    | "communityTelegramUrl"
  >;
}) {
  const waLink = settings.communityWhatsappSuperadmin
    ? whatsappUrl(settings.communityWhatsappSuperadmin)
    : null;
  const hasDownloads = !!(settings.communityApkAdminUrl || settings.communityApkPortalUrl);
  const hasCommunityContacts = !!(waLink || settings.communityTelegramUrl);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Community</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {settings.communityDescription?.trim() || "Deskripsi komunitas belum diisi superadmin."}
          </p>
          {!settings.communityDescription && (
            <p className="text-xs text-muted-foreground">
              Superadmin dapat mengubah konten ini di Pengaturan → Halaman Statis.
            </p>
          )}
        </CardContent>
      </Card>

      {hasDownloads && (
        <Card>
          <CardHeader>
            <CardTitle>Download APK</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {settings.communityApkAdminUrl && (
              <Button asChild variant="outline">
                <a href={settings.communityApkAdminUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-1 h-4 w-4" />
                  {apkDisplayLabelFromUrl(
                    settings.communityApkAdminUrl,
                    MOBILE_APP_NAMES.admin
                  )}
                </a>
              </Button>
            )}
            {settings.communityApkPortalUrl && (
              <Button asChild variant="outline">
                <a href={settings.communityApkPortalUrl} target="_blank" rel="noreferrer">
                  <Download className="mr-1 h-4 w-4" />
                  {apkDisplayLabelFromUrl(
                    settings.communityApkPortalUrl,
                    MOBILE_APP_NAMES.portal
                  )}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {settings.communityDonationImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Donasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Scan QRIS berikut untuk mendukung komunitas.</p>
            <a href={settings.communityDonationImageUrl} target="_blank" rel="noreferrer">
              <img
                src={settings.communityDonationImageUrl}
                alt="QRIS Donasi"
                className="max-h-80 w-full max-w-xs rounded-md border object-contain"
              />
            </a>
            <Button asChild variant="outline" size="sm">
              <a href={settings.communityDonationImageUrl} target="_blank" rel="noreferrer">
                <HandCoins className="mr-1 h-4 w-4" />
                Buka gambar donasi
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasCommunityContacts && (
        <Card>
          <CardHeader>
            <CardTitle>Kontak Komunitas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {waLink && (
              <Button asChild>
                <a href={waLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1 h-4 w-4" />
                  WhatsApp Superadmin
                </a>
              </Button>
            )}
            {settings.communityTelegramUrl && (
              <Button asChild variant="outline">
                <a href={settings.communityTelegramUrl} target="_blank" rel="noreferrer">
                  <Send className="mr-1 h-4 w-4" />
                  Grup Telegram
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
