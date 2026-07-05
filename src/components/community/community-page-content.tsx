import { Download, HandCoins, MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommunityImageLink } from "@/components/community/community-image-link";
import { CommunityLinkButton } from "@/components/community/community-link-button";
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
              <CommunityLinkButton href={settings.communityApkAdminUrl} mode="download" variant="outline">
                <Download className="mr-1 h-4 w-4" />
                {apkDisplayLabelFromUrl(
                  settings.communityApkAdminUrl,
                  MOBILE_APP_NAMES.admin
                )}
              </CommunityLinkButton>
            )}
            {settings.communityApkPortalUrl && (
              <CommunityLinkButton href={settings.communityApkPortalUrl} mode="download" variant="outline">
                <Download className="mr-1 h-4 w-4" />
                {apkDisplayLabelFromUrl(
                  settings.communityApkPortalUrl,
                  MOBILE_APP_NAMES.portal
                )}
              </CommunityLinkButton>
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
            <CommunityImageLink href={settings.communityDonationImageUrl} alt="QRIS Donasi" />
            <CommunityLinkButton
              href={settings.communityDonationImageUrl}
              mode="external"
              variant="outline"
              size="sm"
            >
              <HandCoins className="mr-1 h-4 w-4" />
              Buka gambar donasi
            </CommunityLinkButton>
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
              <CommunityLinkButton href={waLink} mode="external">
                <MessageCircle className="mr-1 h-4 w-4" />
                WhatsApp Superadmin
              </CommunityLinkButton>
            )}
            {settings.communityTelegramUrl && (
              <CommunityLinkButton href={settings.communityTelegramUrl} mode="external" variant="outline">
                <Send className="mr-1 h-4 w-4" />
                Grup Telegram
              </CommunityLinkButton>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
