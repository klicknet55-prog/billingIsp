"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { saveLogoUpload } from "@/lib/uploads";
import { PLATFORM_REVALIDATE_PATHS } from "@/lib/superadmin-pengaturan-nav";
import { parseForm } from "@/lib/validation";
import { patchPlatformSettings } from "./service";
import { isValidTelegramGroupUrl, normalizeTelegramGroupUrl } from "./telegram";
import { normalizeWhatsappNumber } from "./whatsapp";

function revalidatePlatform() {
  for (const p of PLATFORM_REVALIDATE_PATHS) {
    revalidatePath(p);
  }
}

const profilAppSchema = z.object({
  brandName: z.string().trim().min(1, "Nama aplikasi wajib diisi"),
  brandTagline: z.string().trim().optional(),
});

const pemilikSchema = z.object({
  ownerName: z.string().trim().optional(),
  ownerPhone: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || normalizeWhatsappNumber(v).length >= 10,
      "Nomor telepon tidak valid"
    ),
  ownerEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Email tidak valid"),
});

const alamatSchema = z.object({
  address: z.string().trim().optional(),
});

const telegramSchema = z.object({
  telegramGroupUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => isValidTelegramGroupUrl(v ?? ""), "Link Telegram tidak valid"),
});

const staticPagesSchema = z.object({
  tentangTitle: z.string().trim().min(1, "Judul Tentang wajib diisi"),
  tentangContent: z.string().trim().min(1, "Isi halaman Tentang wajib diisi"),
  kontakTitle: z.string().trim().min(1, "Judul Kontak wajib diisi"),
  kontakContent: z.string().trim().min(1, "Isi halaman Kontak wajib diisi"),
  kontakWhatsapp: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || normalizeWhatsappNumber(v).length >= 10,
      "Nomor WhatsApp tidak valid"
    ),
  tcTitle: z.string().trim().min(1, "Judul Syarat & Ketentuan wajib diisi"),
  tcContent: z.string().trim().min(1, "Isi Syarat & Ketentuan wajib diisi"),
  communityDescription: z.string().trim().optional(),
  communityDonationImageUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v).success, "URL gambar donasi tidak valid"),
  communityApkAdminUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v).success, "URL download Admin.net tidak valid"),
  communityApkPortalUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().url().safeParse(v).success, "URL download MyWiFi tidak valid"),
  communityWhatsappSuperadmin: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || normalizeWhatsappNumber(v).length >= 10,
      "Nomor WhatsApp superadmin tidak valid"
    ),
  communityTelegramUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => isValidTelegramGroupUrl(v ?? ""), "Link Telegram community tidak valid"),
});

const mapGeocodingSchema = z.object({
  mapGeocodingProvider: z.enum(["nominatim", "google"]),
  googleGeocodingApiKey: z.string().optional(),
});

const referralSettingsSchema = z.object({
  referralRewardDays: z.coerce.number().int().min(1).max(365),
  referralMaxPerTenant: z.coerce.number().int().min(1).max(1000),
});

export async function saveReferralSettingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(referralSettingsSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  await patchPlatformSettings({
    referralEnabled: formData.get("referralEnabled") === "on",
    referralRewardDays: parsed.data.referralRewardDays,
    referralMaxPerTenant: parsed.data.referralMaxPerTenant,
  });
  revalidatePlatform();
  revalidatePath("/dashboard/referral");
  return { ok: true };
}

export async function saveMapGeocodingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(mapGeocodingSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const keyRaw = parsed.data.googleGeocodingApiKey?.trim() ?? "";
  const patch: Parameters<typeof patchPlatformSettings>[0] = {
    mapGeocodingProvider: parsed.data.mapGeocodingProvider,
  };

  if (keyRaw) {
    patch.googleGeocodingApiKeyEncrypted = encryptSecret(keyRaw);
  }

  await patchPlatformSettings(patch);
  revalidatePath("/superadmin/integrasi");
  revalidatePath("/dashboard/peta");
  return { ok: true };
}

export async function saveProfilAppAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(profilAppSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  await patchPlatformSettings({
    brandName: parsed.data.brandName,
    brandTagline: parsed.data.brandTagline?.trim() || null,
  });
  revalidatePlatform();
  return { ok: true };
}

export async function saveLogoBrandAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const removeLogo = String(formData.get("removeLogo") ?? "") === "on";
  let logoUrl: string | null | undefined = undefined;

  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    try {
      logoUrl = await saveLogoUpload("platform-logo", file, "platform");
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Gagal mengunggah logo." };
    }
  }

  if (removeLogo) {
    await patchPlatformSettings({ logoUrl: null });
  } else if (logoUrl !== undefined) {
    await patchPlatformSettings({ logoUrl });
  }

  revalidatePlatform();
  return { ok: true };
}

export async function savePemilikAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(pemilikSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const phoneRaw = parsed.data.ownerPhone?.trim() ?? "";
  await patchPlatformSettings({
    ownerName: parsed.data.ownerName?.trim() || null,
    ownerPhone: phoneRaw ? normalizeWhatsappNumber(phoneRaw) : null,
    ownerEmail: parsed.data.ownerEmail?.trim().toLowerCase() || null,
  });
  revalidatePlatform();
  return { ok: true };
}

export async function saveAlamatAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(alamatSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  await patchPlatformSettings({
    address: parsed.data.address?.trim() || null,
  });
  revalidatePlatform();
  return { ok: true };
}

export async function saveTelegramAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(telegramSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const raw = parsed.data.telegramGroupUrl?.trim() ?? "";
  await patchPlatformSettings({
    telegramGroupUrl: raw ? normalizeTelegramGroupUrl(raw) : null,
  });
  revalidatePlatform();
  return { ok: true };
}

export async function saveStaticPagesAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(staticPagesSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const waRaw = parsed.data.kontakWhatsapp?.trim() ?? "";
  const communityWaRaw = parsed.data.communityWhatsappSuperadmin?.trim() ?? "";
  const communityTelegramRaw = parsed.data.communityTelegramUrl?.trim() ?? "";
  await patchPlatformSettings({
    tentangTitle: parsed.data.tentangTitle,
    tentangContent: parsed.data.tentangContent,
    kontakTitle: parsed.data.kontakTitle,
    kontakContent: parsed.data.kontakContent,
    kontakWhatsapp: waRaw ? normalizeWhatsappNumber(waRaw) : null,
    tcTitle: parsed.data.tcTitle,
    tcContent: parsed.data.tcContent,
    communityDescription: parsed.data.communityDescription?.trim() || null,
    communityDonationImageUrl: parsed.data.communityDonationImageUrl?.trim() || null,
    communityApkAdminUrl: parsed.data.communityApkAdminUrl?.trim() || null,
    communityApkPortalUrl: parsed.data.communityApkPortalUrl?.trim() || null,
    communityWhatsappSuperadmin: communityWaRaw ? normalizeWhatsappNumber(communityWaRaw) : null,
    communityTelegramUrl: communityTelegramRaw ? normalizeTelegramGroupUrl(communityTelegramRaw) : null,
  });
  revalidatePlatform();
  return { ok: true };
}
