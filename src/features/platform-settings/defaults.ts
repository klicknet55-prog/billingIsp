import type { PlatformSettings } from "@/lib/db/schema";
import { PLATFORM_SETTINGS_ID } from "@/lib/db/schema";
import { DEFAULT_BRAND_NAME } from "@/lib/site";

export const DEFAULT_PLATFORM_SETTINGS: Omit<PlatformSettings, "updatedAt"> & {
  updatedAt?: Date;
} = {
  id: PLATFORM_SETTINGS_ID,
  brandName: DEFAULT_BRAND_NAME,
  brandTagline:
    "Kelola pelanggan, billing, perangkat Mikrotik, penagihan lapangan, dan portal pelanggan dalam satu platform.",
  logoUrl: null,
  ownerName: null,
  ownerPhone: null,
  ownerEmail: null,
  address: null,
  telegramGroupUrl: null,
  tentangTitle: "Tentang Kami",
  tentangContent:
    "Platform manajemen billing dan jaringan untuk ISP serta RT-RW Net.\n\nKami membantu operator mengelola pelanggan, invoice, perangkat Mikrotik, penagihan lapangan, dan portal pelanggan dalam satu sistem terintegrasi.",
  kontakTitle: "Hubungi Kami",
  kontakContent:
    "Butuh bantuan teknis, demo produk, atau informasi paket SaaS?\n\nTim support kami siap membantu melalui WhatsApp pada jam operasional.",
  kontakWhatsapp: "6281234567890",
  tcTitle: "Syarat & Ketentuan",
  tcContent:
    "1. Pengguna wajib menjaga kerahasiaan akun dashboard.\n2. Data pelanggan menjadi tanggung jawab masing-masing tenant ISP.\n3. Pembayaran langganan SaaS mengikuti paket yang dipilih saat pendaftaran.\n4. Platform dapat menangguhkan akun yang melanggar ketentuan atau menunggak langganan.\n5. Ketentuan dapat diperbarui; perubahan akan diinformasikan melalui dashboard.",
  communityDescription:
    "Gabung komunitas pengguna Admin.net & MyWiFi untuk berbagi update, tips operasional ISP, dan bantuan teknis.",
  communityDonationImageUrl: null,
  communityApkAdminUrl: null,
  communityApkPortalUrl: null,
  communityWhatsappSuperadmin: "6281234567890",
  communityTelegramUrl: null,
  cronLastRunAt: null,
  cronLastResult: null,
  mapGeocodingProvider: "nominatim",
  googleGeocodingApiKeyEncrypted: null,
  referralEnabled: false,
  referralRewardDays: 7,
  referralMaxPerTenant: 10,
};
