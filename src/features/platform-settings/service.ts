import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  PLATFORM_SETTINGS_ID,
  platformSettings,
  type PlatformSettings,
} from "@/lib/db/schema";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { DEFAULT_PLATFORM_SETTINGS } from "./defaults";

function defaultPlatformBrand(): PlatformBrand {
  return {
    name: DEFAULT_PLATFORM_SETTINGS.brandName?.trim() || DEFAULT_BRAND_NAME,
    tagline:
      DEFAULT_PLATFORM_SETTINGS.brandTagline?.trim() ||
      "Kelola pelanggan, billing, Mikrotik, dan portal pelanggan dalam satu platform.",
    logoUrl: DEFAULT_PLATFORM_SETTINGS.logoUrl,
    ownerName: DEFAULT_PLATFORM_SETTINGS.ownerName,
    ownerPhone: DEFAULT_PLATFORM_SETTINGS.ownerPhone,
    ownerEmail: DEFAULT_PLATFORM_SETTINGS.ownerEmail,
    address: DEFAULT_PLATFORM_SETTINGS.address,
    telegramGroupUrl: DEFAULT_PLATFORM_SETTINGS.telegramGroupUrl,
  };
}

function defaultPlatformSettingsRow(): PlatformSettings {
  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    updatedAt: new Date(),
  } as PlatformSettings;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const [existing] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);
    if (existing) return existing;

    await db
      .insert(platformSettings)
      .values({
        id: PLATFORM_SETTINGS_ID,
        brandName: DEFAULT_PLATFORM_SETTINGS.brandName,
        brandTagline: DEFAULT_PLATFORM_SETTINGS.brandTagline,
        logoUrl: DEFAULT_PLATFORM_SETTINGS.logoUrl,
        ownerName: DEFAULT_PLATFORM_SETTINGS.ownerName,
        ownerPhone: DEFAULT_PLATFORM_SETTINGS.ownerPhone,
        ownerEmail: DEFAULT_PLATFORM_SETTINGS.ownerEmail,
        address: DEFAULT_PLATFORM_SETTINGS.address,
        telegramGroupUrl: DEFAULT_PLATFORM_SETTINGS.telegramGroupUrl,
        tentangTitle: DEFAULT_PLATFORM_SETTINGS.tentangTitle,
        tentangContent: DEFAULT_PLATFORM_SETTINGS.tentangContent,
        kontakTitle: DEFAULT_PLATFORM_SETTINGS.kontakTitle,
        kontakContent: DEFAULT_PLATFORM_SETTINGS.kontakContent,
        kontakWhatsapp: DEFAULT_PLATFORM_SETTINGS.kontakWhatsapp,
        tcTitle: DEFAULT_PLATFORM_SETTINGS.tcTitle,
        tcContent: DEFAULT_PLATFORM_SETTINGS.tcContent,
        communityDescription: DEFAULT_PLATFORM_SETTINGS.communityDescription,
        communityDonationImageUrl: DEFAULT_PLATFORM_SETTINGS.communityDonationImageUrl,
        communityApkAdminUrl: DEFAULT_PLATFORM_SETTINGS.communityApkAdminUrl,
        communityApkPortalUrl: DEFAULT_PLATFORM_SETTINGS.communityApkPortalUrl,
        communityWhatsappSuperadmin: DEFAULT_PLATFORM_SETTINGS.communityWhatsappSuperadmin,
        communityTelegramUrl: DEFAULT_PLATFORM_SETTINGS.communityTelegramUrl,
      })
      .onConflictDoNothing({ target: platformSettings.id });

    const [row] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);

    if (row) return row;
    return defaultPlatformSettingsRow();
  } catch {
    /* Build / installer: DB belum siap — fallback default tanpa crash */
    return defaultPlatformSettingsRow();
  }
}

export type PlatformBrand = {
  name: string;
  tagline: string;
  logoUrl: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  address: string | null;
  telegramGroupUrl: string | null;
};

export async function getPlatformBrand(): Promise<PlatformBrand> {
  try {
    const settings = await getPlatformSettings();
    return {
      name: settings.brandName?.trim() || DEFAULT_BRAND_NAME,
      tagline:
        settings.brandTagline?.trim() ||
        "Kelola pelanggan, billing, Mikrotik, dan portal pelanggan dalam satu platform.",
      logoUrl: settings.logoUrl,
      ownerName: settings.ownerName,
      ownerPhone: settings.ownerPhone,
      ownerEmail: settings.ownerEmail,
      address: settings.address,
      telegramGroupUrl: settings.telegramGroupUrl,
    };
  } catch {
    return defaultPlatformBrand();
  }
}

export type PlatformSettingsPatch = Partial<{
  brandName: string;
  brandTagline: string | null;
  logoUrl: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  address: string | null;
  telegramGroupUrl: string | null;
  tentangTitle: string;
  tentangContent: string;
  kontakTitle: string;
  kontakContent: string;
  kontakWhatsapp: string | null;
  tcTitle: string;
  tcContent: string;
  communityDescription: string | null;
  communityDonationImageUrl: string | null;
  communityApkAdminUrl: string | null;
  communityApkPortalUrl: string | null;
  communityWhatsappSuperadmin: string | null;
  communityTelegramUrl: string | null;
  mapGeocodingProvider: "nominatim" | "google";
  googleGeocodingApiKeyEncrypted: string | null;
}>;

export async function patchPlatformSettings(
  patch: PlatformSettingsPatch
): Promise<PlatformSettings> {
  await getPlatformSettings();

  const [updated] = await db
    .update(platformSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
    .returning();

  return updated;
}
