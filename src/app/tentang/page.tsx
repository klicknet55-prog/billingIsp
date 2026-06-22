import type { Metadata } from "next";
import { StaticPageBody } from "@/components/content/static-page-body";
import { PublicSiteLayout } from "@/components/layout/public-site-layout";
import { getPlatformBrand, getPlatformSettings } from "@/features/platform-settings/service";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, brand] = await Promise.all([getPlatformSettings(), getPlatformBrand()]);
  return {
    title: `${settings.tentangTitle} — ${brand.name}`,
  };
}

export default async function TentangPage() {
  const settings = await getPlatformSettings();

  return (
    <PublicSiteLayout>
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{settings.tentangTitle}</h1>
        <div className="mt-6">
          <StaticPageBody content={settings.tentangContent} />
        </div>
      </article>
    </PublicSiteLayout>
  );
}
