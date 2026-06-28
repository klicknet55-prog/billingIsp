"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import type { ActionState } from "@/features/auth/actions";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { parseForm } from "@/lib/validation";
import {
  upsertTenantDuitkuConfig,
  upsertTenantWhatsAppConfig,
  upsertPlatformWhatsAppConfig,
  ensureTenantKlicknetFromEnv,
  ensurePlatformKlicknetFromEnv,
} from "./service";
import { decryptSecret } from "@/lib/crypto";
import { klicknetCreateDevice, klicknetFetchQr } from "@/lib/integrations/whatsapp/klicknet";
import {
  resolveWhatsAppApiUrl,
  resolveGowaBasicAuthUser,
  resolveGowaBasicAuthPassword,
  resolveKlicknetAuth,
  buildKlicknetDeviceId,
} from "@/lib/integrations/whatsapp/config";

const duitkuSchema = z.object({
  merchantCode: z.string().trim().min(1, "Merchant code wajib"),
  apiKey: z.string().optional(),
  callbackUrl: z.string().trim().url("Callback URL tidak valid").optional().or(z.literal("")),
  inquiryUrl: z.string().trim().url("Inquiry URL tidak valid").optional().or(z.literal("")),
  paymentMethod: z.string().trim().min(1, "Payment method wajib"),
  isEnabled: z.string().optional(),
});

const waSchema = z
  .object({
    provider: z.enum(["gateway", "waba", "klicknet"]).default("waba"),
    apiUrl: z.string().trim().optional().or(z.literal("")),
    apiToken: z.string().optional(),
    phoneNumberId: z.string().optional(),
    deviceId: z.string().optional(),
    basicAuthUser: z.string().optional(),
    isEnabled: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const apiUrl = resolveWhatsAppApiUrl(data.provider, data.apiUrl ?? "");
    if (!apiUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["apiUrl"],
        message:
          data.provider === "klicknet"
            ? "Server URL wajib — set KLICKNET_WA_BASE_URL di .env atau isi manual."
            : "Server URL wajib diisi.",
      });
      return;
    }
    try {
      new URL(apiUrl);
    } catch {
      ctx.addIssue({ code: "custom", path: ["apiUrl"], message: "API URL tidak valid." });
    }
    if (data.provider === "klicknet" && !resolveGowaBasicAuthUser(data.basicAuthUser ?? "")) {
      ctx.addIssue({
        code: "custom",
        path: ["basicAuthUser"],
        message:
          "Username Basic Auth wajib — set KLICKNET_WA_BASIC_USER di .env atau isi manual.",
      });
    }
  });

function parseWaForm(formData: FormData) {
  const parsed = parseForm(waSchema, formData);
  if (!parsed.ok) return parsed;
  const { provider } = parsed.data;
  const apiUrl = resolveWhatsAppApiUrl(provider, parsed.data.apiUrl ?? "");
  let basicAuthUser = parsed.data.basicAuthUser?.trim() ?? "";
  let apiToken = parsed.data.apiToken?.trim() ?? "";
  if (provider === "klicknet") {
    basicAuthUser = resolveGowaBasicAuthUser(basicAuthUser);
    if (!apiToken) apiToken = resolveGowaBasicAuthPassword("");
  }
  return {
    ok: true as const,
    data: {
      ...parsed.data,
      apiUrl,
      basicAuthUser,
      apiToken: apiToken || undefined,
    },
  };
}

const waTestSchema = z.object({
  phone: z.string().trim().min(8, "Nomor WA test wajib diisi"),
  message: z.string().trim().min(1, "Pesan test wajib diisi"),
});

export async function saveTenantDuitkuConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  const parsed = parseForm(duitkuSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  try {
    await upsertTenantDuitkuConfig({
      tenantId: user.tenantId!,
      merchantCode: parsed.data.merchantCode,
      apiKey: parsed.data.apiKey,
      callbackUrl: parsed.data.callbackUrl || undefined,
      inquiryUrl: parsed.data.inquiryUrl || undefined,
      paymentMethod: parsed.data.paymentMethod,
      isEnabled: parsed.data.isEnabled === "on",
    });
    revalidatePath("/dashboard/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveTenantWhatsAppConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  const parsed = parseWaForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  try {
    await upsertTenantWhatsAppConfig({
      tenantId: user.tenantId!,
      provider: parsed.data.provider,
      apiUrl: parsed.data.apiUrl,
      apiToken: parsed.data.apiToken,
      phoneNumberId: parsed.data.phoneNumberId || undefined,
      deviceId: parsed.data.deviceId || undefined,
      basicAuthUser: parsed.data.basicAuthUser || undefined,
      isEnabled: parsed.data.isEnabled === "on",
    });
    revalidatePath("/dashboard/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testTenantWhatsAppConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  const parsed = parseForm(waTestSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  try {
    await getWhatsAppClient().sendNotification(
      parsed.data.phone,
      parsed.data.message,
      user.tenantId!
    );
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testPlatformWhatsAppConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(waTestSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  try {
    await getWhatsAppClient().sendNotification(parsed.data.phone, parsed.data.message);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createKlicknetDeviceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState & { deviceId?: string; qrLink?: string }> {
  const user = await requireUser(["owner", "admin"]);
  const deviceName = String(formData.get("deviceName") ?? "").trim();
  if (!deviceName) return { error: "Nama device wajib diisi." };

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId!),
  });
  const deviceId = buildKlicknetDeviceId({
    scope: "tenant",
    tenantId: user.tenantId!,
    tenantDomain: tenant?.domain,
    rawName: deviceName,
  });

  const row = await ensureTenantKlicknetFromEnv(user.tenantId!);
  if (!row) {
    return {
      error:
        "Konfigurasi Klicknet belum siap. Pilih provider Klicknet lalu Simpan, atau lengkapi KLICKNET_WA_* di .env.",
    };
  }

  try {
    const auth = resolveKlicknetAuth({
      basicAuthUser: row.basicAuthUser,
      password: decryptSecret(row.apiTokenEncrypted),
    });
    if (!auth.username || !auth.password) {
      return { error: "Basic Auth GOWA belum lengkap — simpan konfigurasi atau set .env." };
    }
    const baseUrl = resolveWhatsAppApiUrl("klicknet", row.apiUrl);
    const created = await klicknetCreateDevice(
      { baseUrl, username: auth.username, password: auth.password },
      deviceId
    );
    const resolvedDeviceId = created.deviceId;
    await upsertTenantWhatsAppConfig({
      tenantId: user.tenantId!,
      apiUrl: baseUrl,
      provider: "klicknet",
      apiToken: auth.password,
      deviceId: resolvedDeviceId,
      basicAuthUser: auth.username,
      isEnabled: row.isEnabled,
    });
    const qr = await klicknetFetchQr({
      baseUrl,
      username: auth.username,
      password: auth.password,
      deviceId: resolvedDeviceId,
    });
    revalidatePath("/dashboard/integrasi");
    return { ok: true, deviceId: resolvedDeviceId, qrLink: qr.qrLink };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function savePlatformWhatsAppConfigAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseWaForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  try {
    await upsertPlatformWhatsAppConfig({
      provider: parsed.data.provider,
      apiUrl: parsed.data.apiUrl,
      apiToken: parsed.data.apiToken,
      phoneNumberId: parsed.data.phoneNumberId || undefined,
      deviceId: parsed.data.deviceId || undefined,
      basicAuthUser: parsed.data.basicAuthUser || undefined,
      isEnabled: parsed.data.isEnabled === "on",
    });
    revalidatePath("/superadmin/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function createPlatformKlicknetDeviceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState & { deviceId?: string; qrLink?: string }> {
  await requireUser(["superadmin"]);
  const deviceName = String(formData.get("deviceName") ?? "").trim();
  if (!deviceName) return { error: "Nama device wajib diisi." };

  const deviceId = buildKlicknetDeviceId({
    scope: "platform",
    rawName: deviceName,
  });

  const row = await ensurePlatformKlicknetFromEnv();
  if (!row) {
    return {
      error:
        "Konfigurasi Klicknet belum siap. Pilih provider Klicknet lalu Simpan, atau lengkapi KLICKNET_WA_* di .env.",
    };
  }

  try {
    const auth = resolveKlicknetAuth({
      basicAuthUser: row.basicAuthUser,
      password: decryptSecret(row.apiTokenEncrypted),
    });
    if (!auth.username || !auth.password) {
      return { error: "Basic Auth GOWA belum lengkap — simpan konfigurasi atau set .env." };
    }
    const baseUrl = resolveWhatsAppApiUrl("klicknet", row.apiUrl);
    const created = await klicknetCreateDevice(
      { baseUrl, username: auth.username, password: auth.password },
      deviceId
    );
    const resolvedDeviceId = created.deviceId;
    await upsertPlatformWhatsAppConfig({
      apiUrl: baseUrl,
      provider: "klicknet",
      apiToken: auth.password,
      deviceId: resolvedDeviceId,
      basicAuthUser: auth.username,
      isEnabled: row.isEnabled,
    });
    const qr = await klicknetFetchQr({
      baseUrl,
      username: auth.username,
      password: auth.password,
      deviceId: resolvedDeviceId,
    });
    revalidatePath("/superadmin/integrasi");
    return { ok: true, deviceId: resolvedDeviceId, qrLink: qr.qrLink };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

