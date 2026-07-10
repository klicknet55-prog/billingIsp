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
  getTenantWhatsAppConfigRow,
  getPlatformWhatsAppConfigRow,
} from "./service";
import { decryptSecret } from "@/lib/crypto";
import { klicknetCreateDevice, klicknetFetchQr, klicknetFetchPairCode, klicknetLogoutAndDeleteDevice, klicknetReconnectDevice } from "@/lib/integrations/whatsapp/klicknet";
import {
  resolveWhatsAppApiUrl,
  resolveGowaBasicAuthUser,
  resolveGowaBasicAuthPassword,
  resolveKlicknetAuth,
  buildKlicknetDeviceId,
} from "@/lib/integrations/whatsapp/config";
import type { TenantWhatsAppConfig } from "@/lib/db/schema";

const duitkuSchema = z.object({
  merchantCode: z.string().trim().min(1, "Merchant code wajib"),
  apiKey: z.string().optional(),
  callbackUrl: z.string().trim().url("Callback URL tidak valid").min(1, "Callback URL wajib"),
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
            ? "SERVER KLICKnet wajib — set KLICKNET_WA_BASE_URL di .env atau isi manual."
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

type KlicknetDeviceActionState = ActionState & {
  deviceId?: string;
  qrLink?: string;
  pairCode?: string;
  loginMode?: "qr" | "code";
};

function klicknetCredsFromRow(row: {
  apiUrl: string;
  apiTokenEncrypted: string;
  basicAuthUser: string | null;
  deviceId: string | null;
}) {
  const auth = resolveKlicknetAuth({
    basicAuthUser: row.basicAuthUser,
    password: decryptSecret(row.apiTokenEncrypted),
  });
  if (!auth.username || !auth.password) {
    throw new Error("Basic Auth SERVER KLICKnet belum lengkap — simpan konfigurasi atau set .env.");
  }
  const baseUrl = resolveWhatsAppApiUrl("klicknet", row.apiUrl);
  return {
    baseUrl,
    username: auth.username,
    password: auth.password,
    deviceId: row.deviceId?.trim() ?? "",
  };
}

async function logoutKlicknetStoredDevice(row: {
  apiUrl: string;
  apiTokenEncrypted: string;
  basicAuthUser: string | null;
  deviceId: string | null;
}) {
  if (!row.deviceId?.trim()) return;
  const creds = klicknetCredsFromRow(row);
  await klicknetLogoutAndDeleteDevice({
    baseUrl: creds.baseUrl,
    username: creds.username,
    password: creds.password,
    deviceId: creds.deviceId,
  });
}

async function syncTenantKlicknetDeviceId(input: {
  tenantId: string;
  tenantDomain?: string;
  deviceName: string;
  current: TenantWhatsAppConfig | null;
}): Promise<string | undefined> {
  if (!input.deviceName) return input.current?.deviceId ?? undefined;

  const targetDeviceId = buildKlicknetDeviceId({
    scope: "tenant",
    tenantId: input.tenantId,
    tenantDomain: input.tenantDomain,
    rawName: input.deviceName,
  });

  if (input.current?.deviceId === targetDeviceId) {
    return targetDeviceId;
  }

  if (input.current?.deviceId && input.current.provider === "klicknet") {
    await logoutKlicknetStoredDevice(input.current);
  }

  const registered = await registerKlicknetDeviceForTenant(input.tenantId, input.deviceName);
  return registered.deviceId;
}

async function syncPlatformKlicknetDeviceId(input: {
  deviceName: string;
  current: Awaited<ReturnType<typeof getPlatformWhatsAppConfigRow>>;
}): Promise<string | undefined> {
  if (!input.deviceName) return input.current?.deviceId ?? undefined;

  const targetDeviceId = buildKlicknetDeviceId({
    scope: "platform",
    rawName: input.deviceName,
  });

  if (input.current?.deviceId === targetDeviceId) {
    return targetDeviceId;
  }

  if (input.current?.deviceId && input.current.provider === "klicknet") {
    await logoutKlicknetStoredDevice(input.current);
  }

  const registered = await registerKlicknetDeviceForPlatform(input.deviceName);
  return registered.deviceId;
}

async function registerKlicknetDeviceForTenant(tenantId: string, deviceName: string) {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  const deviceId = buildKlicknetDeviceId({
    scope: "tenant",
    tenantId,
    tenantDomain: tenant?.domain,
    rawName: deviceName,
  });
  const row = await ensureTenantKlicknetFromEnv(tenantId);
  if (!row) {
    throw new Error(
      "Konfigurasi Klicknet belum siap. Pilih provider Klicknet lalu Simpan, atau lengkapi KLICKNET_WA_* di .env."
    );
  }
  const creds = klicknetCredsFromRow(row);
  const created = await klicknetCreateDevice(
    { baseUrl: creds.baseUrl, username: creds.username, password: creds.password },
    deviceId
  );
  return { ...creds, deviceId: created.deviceId };
}

async function registerKlicknetDeviceForPlatform(deviceName: string) {
  const deviceId = buildKlicknetDeviceId({ scope: "platform", rawName: deviceName });
  const row = await ensurePlatformKlicknetFromEnv();
  if (!row) {
    throw new Error(
      "Konfigurasi Klicknet belum siap. Pilih provider Klicknet lalu Simpan, atau lengkapi KLICKNET_WA_* di .env."
    );
  }
  const creds = klicknetCredsFromRow(row);
  const created = await klicknetCreateDevice(
    { baseUrl: creds.baseUrl, username: creds.username, password: creds.password },
    deviceId
  );
  return { ...creds, deviceId: created.deviceId };
}

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
  const deviceName = String(formData.get("deviceName") ?? "").trim();
  const tenantId = user.tenantId!;
  const current = await getTenantWhatsAppConfigRow(tenantId);

  try {
    if (
      current?.provider === "klicknet" &&
      current.deviceId &&
      parsed.data.provider !== "klicknet"
    ) {
      await logoutKlicknetStoredDevice(current);
    }

    let deviceId: string | undefined =
      parsed.data.provider === "klicknet" ? current?.deviceId ?? undefined : undefined;

    if (parsed.data.provider === "klicknet" && deviceName) {
      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      deviceId = await syncTenantKlicknetDeviceId({
        tenantId,
        tenantDomain: tenant?.domain,
        deviceName,
        current,
      });
    }

    await upsertTenantWhatsAppConfig({
      tenantId,
      provider: parsed.data.provider,
      apiUrl: parsed.data.apiUrl,
      apiToken: parsed.data.apiToken,
      phoneNumberId: parsed.data.phoneNumberId || undefined,
      deviceId,
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

export async function loginKlicknetDeviceAction(
  _prev: KlicknetDeviceActionState,
  formData: FormData
): Promise<KlicknetDeviceActionState> {
  const user = await requireUser(["owner", "admin"]);
  const loginMode = String(formData.get("loginMode") ?? "qr") === "code" ? "code" : "qr";
  const row = await ensureTenantKlicknetFromEnv(user.tenantId!);
  if (!row?.deviceId) {
    return { error: "Device belum dibuat. Isi nama device lalu Simpan WhatsApp terlebih dahulu." };
  }

  try {
    const creds = klicknetCredsFromRow(row);
    const credsWithDevice = {
      baseUrl: creds.baseUrl,
      username: creds.username,
      password: creds.password,
      deviceId: creds.deviceId,
    };

    if (loginMode === "code") {
      const phone = String(formData.get("loginPhone") ?? "").trim();
      if (!phone) return { error: "Nomor WhatsApp wajib untuk login dengan kode." };
      const result = await klicknetFetchPairCode(credsWithDevice, phone);
      revalidatePath("/dashboard/integrasi");
      return {
        ok: true,
        deviceId: creds.deviceId,
        pairCode: result.pairCode,
        loginMode: "code",
      };
    }

    const qr = await klicknetFetchQr(credsWithDevice);
    revalidatePath("/dashboard/integrasi");
    return { ok: true, deviceId: creds.deviceId, qrLink: qr.qrLink, loginMode: "qr" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function logoutKlicknetDeviceAction(
  _prev: ActionState
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  const row = await getTenantWhatsAppConfigRow(user.tenantId!);
  if (!row?.deviceId) {
    return { error: "Tidak ada device untuk di-logout." };
  }

  try {
    const creds = klicknetCredsFromRow(row);
    await klicknetLogoutAndDeleteDevice({
      baseUrl: creds.baseUrl,
      username: creds.username,
      password: creds.password,
      deviceId: creds.deviceId,
    });
    await upsertTenantWhatsAppConfig({
      tenantId: user.tenantId!,
      provider: row.provider,
      apiUrl: row.apiUrl,
      deviceId: "",
      basicAuthUser: row.basicAuthUser ?? undefined,
      isEnabled: row.isEnabled,
    });
    revalidatePath("/dashboard/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function reconnectKlicknetDeviceAction(
  _prev: ActionState
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  const row = await ensureTenantKlicknetFromEnv(user.tenantId!);
  if (!row?.deviceId) {
    return { error: "Device belum dibuat. Simpan konfigurasi dengan nama device terlebih dahulu." };
  }

  try {
    const creds = klicknetCredsFromRow(row);
    await klicknetReconnectDevice({
      baseUrl: creds.baseUrl,
      username: creds.username,
      password: creds.password,
      deviceId: creds.deviceId,
    });
    revalidatePath("/dashboard/integrasi");
    return { ok: true };
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
  const deviceName = String(formData.get("deviceName") ?? "").trim();
  const current = await getPlatformWhatsAppConfigRow();

  try {
    if (
      current?.provider === "klicknet" &&
      current.deviceId &&
      parsed.data.provider !== "klicknet"
    ) {
      await logoutKlicknetStoredDevice(current);
    }

    let deviceId: string | undefined =
      parsed.data.provider === "klicknet" ? current?.deviceId ?? undefined : undefined;

    if (parsed.data.provider === "klicknet" && deviceName) {
      deviceId = await syncPlatformKlicknetDeviceId({ deviceName, current });
    }

    await upsertPlatformWhatsAppConfig({
      provider: parsed.data.provider,
      apiUrl: parsed.data.apiUrl,
      apiToken: parsed.data.apiToken,
      phoneNumberId: parsed.data.phoneNumberId || undefined,
      deviceId,
      basicAuthUser: parsed.data.basicAuthUser || undefined,
      isEnabled: parsed.data.isEnabled === "on",
    });

    revalidatePath("/superadmin/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function loginPlatformKlicknetDeviceAction(
  _prev: KlicknetDeviceActionState,
  formData: FormData
): Promise<KlicknetDeviceActionState> {
  await requireUser(["superadmin"]);
  const loginMode = String(formData.get("loginMode") ?? "qr") === "code" ? "code" : "qr";
  const row = await ensurePlatformKlicknetFromEnv();
  if (!row?.deviceId) {
    return { error: "Device belum dibuat. Isi nama device lalu Simpan WhatsApp terlebih dahulu." };
  }

  try {
    const creds = klicknetCredsFromRow(row);
    const credsWithDevice = {
      baseUrl: creds.baseUrl,
      username: creds.username,
      password: creds.password,
      deviceId: creds.deviceId,
    };

    if (loginMode === "code") {
      const phone = String(formData.get("loginPhone") ?? "").trim();
      if (!phone) return { error: "Nomor WhatsApp wajib untuk login dengan kode." };
      const result = await klicknetFetchPairCode(credsWithDevice, phone);
      revalidatePath("/superadmin/integrasi");
      return {
        ok: true,
        deviceId: creds.deviceId,
        pairCode: result.pairCode,
        loginMode: "code",
      };
    }

    const qr = await klicknetFetchQr(credsWithDevice);
    revalidatePath("/superadmin/integrasi");
    return { ok: true, deviceId: creds.deviceId, qrLink: qr.qrLink, loginMode: "qr" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function logoutPlatformKlicknetDeviceAction(
  _prev: ActionState
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const row = await getPlatformWhatsAppConfigRow();
  if (!row?.deviceId) {
    return { error: "Tidak ada device untuk di-logout." };
  }

  try {
    const creds = klicknetCredsFromRow(row);
    await klicknetLogoutAndDeleteDevice({
      baseUrl: creds.baseUrl,
      username: creds.username,
      password: creds.password,
      deviceId: creds.deviceId,
    });
    await upsertPlatformWhatsAppConfig({
      provider: row.provider,
      apiUrl: row.apiUrl,
      deviceId: "",
      basicAuthUser: row.basicAuthUser ?? undefined,
      isEnabled: row.isEnabled,
    });
    revalidatePath("/superadmin/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function reconnectPlatformKlicknetDeviceAction(
  _prev: ActionState
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const row = await ensurePlatformKlicknetFromEnv();
  if (!row?.deviceId) {
    return { error: "Device belum dibuat. Simpan konfigurasi dengan nama device terlebih dahulu." };
  }

  try {
    const creds = klicknetCredsFromRow(row);
    await klicknetReconnectDevice({
      baseUrl: creds.baseUrl,
      username: creds.username,
      password: creds.password,
      deviceId: creds.deviceId,
    });
    revalidatePath("/superadmin/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

