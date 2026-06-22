import type { Metadata } from "next";
import { MessageCircle, Send } from "lucide-react";
import { StaticPageBody } from "@/components/content/static-page-body";
import { PublicSiteLayout } from "@/components/layout/public-site-layout";
import { Button } from "@/components/ui/button";
import { getPlatformBrand, getPlatformSettings } from "@/features/platform-settings/service";
import { whatsappUrl } from "@/features/platform-settings/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, brand] = await Promise.all([getPlatformSettings(), getPlatformBrand()]);
  return {
    title: `${settings.kontakTitle} — ${brand.name}`,
  };
}

export default async function KontakPage() {
  const [settings, brand] = await Promise.all([getPlatformSettings(), getPlatformBrand()]);
  const waLink = settings.kontakWhatsapp
    ? whatsappUrl(
        settings.kontakWhatsapp,
        `Halo ${brand.name}, saya ingin bertanya tentang platform billing ISP.`
      )
    : null;
  const telegramLink = brand.telegramGroupUrl;
  const hasContactButtons = waLink || telegramLink;
  const hasPlatformInfo =
    brand.ownerName || brand.address || brand.ownerEmail || brand.ownerPhone;

  return (
    <PublicSiteLayout>
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{settings.kontakTitle}</h1>
        <div className="mt-6">
          <StaticPageBody content={settings.kontakContent} />
        </div>
        {hasContactButtons && (
          <div className="mt-8 flex flex-wrap gap-3">
            {waLink && (
              <Button asChild size="lg" className="gap-2">
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-5" />
                  Chat via WhatsApp
                </a>
              </Button>
            )}
            {telegramLink && (
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                  <Send className="size-5" />
                  Grup Telegram
                </a>
              </Button>
            )}
          </div>
        )}
        {waLink && (
          <p className="mt-2 text-xs text-muted-foreground">
            WhatsApp: {settings.kontakWhatsapp}
          </p>
        )}
        {hasPlatformInfo && (
          <div className="mt-6 rounded-lg border p-4 text-sm">
            <p className="font-medium">Informasi platform</p>
            {brand.ownerName && <p className="mt-2">{brand.ownerName}</p>}
            {brand.address && (
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{brand.address}</p>
            )}
            {brand.ownerPhone && (
              <p className="mt-1 text-muted-foreground">Tel: {brand.ownerPhone}</p>
            )}
            {brand.ownerEmail && (
              <p className="text-muted-foreground">Email: {brand.ownerEmail}</p>
            )}
          </div>
        )}
      </article>
    </PublicSiteLayout>
  );
}
