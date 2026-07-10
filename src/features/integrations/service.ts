import "server-only";
import { and, eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import {
  platformWhatsAppConfigs,
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  type TenantDuitkuConfig,
  type TenantWhatsAppConfig,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils";
import {
  getGowaBaseUrlFromEnv,
  getGowaBasicPasswordFromEnv,
  getGowaBasicUserFromEnv,
  isGowaFullyFromEnv,
  resolveKlicknetAuth,
  resolveWhatsAppApiUrl,
} from "@/lib/integrations/whatsapp/config";
import { resolveDuitkuInquiryUrl } from "@/lib/integrations/duitku/config";

export interface DuitkuTenantConfigResolved {
  merchantCode: string;
  apiKey: string;
  callbackUrl: string;
  inquiryUrl: string;
  paymentMethod: string;
  source: "tenant";
}

export interface WhatsAppTenantConfigResolved {
  apiUrl: string;
  apiToken: string;
  provider: "gateway" | "waba" | "klicknet";
  phoneNumberId: string;
  deviceId?: string;
  basicAuthUser?: string;
  source: "tenant" | "global" | "platform";
}

const PLATFORM_WA_ID = "platform";

function resolveWaRow(row: {
  apiUrl: string;
  apiTokenEncrypted: string;
  provider: "gateway" | "waba" | "klicknet";
  phoneNumberId: string | null;
  deviceId?: string | null;
  basicAuthUser?: string | null;
}, source: WhatsAppTenantConfigResolved["source"]): WhatsAppTenantConfigResolved {
  if (row.provider === "klicknet") {
    const auth = resolveKlicknetAuth({
      basicAuthUser: row.basicAuthUser,
      password: decryptSecret(row.apiTokenEncrypted),
    });
    return {
      apiUrl: resolveWhatsAppApiUrl("klicknet", row.apiUrl),
      apiToken: auth.password,
      provider: "klicknet",
      phoneNumberId: row.phoneNumberId ?? "",
      deviceId: row.deviceId ?? undefined,
      basicAuthUser: auth.username,
      source,
    };
  }
  return {
    apiUrl: row.apiUrl,
    apiToken: decryptSecret(row.apiTokenEncrypted),
    provider: row.provider,
    phoneNumberId: row.phoneNumberId ?? "",
    deviceId: row.deviceId ?? undefined,
    basicAuthUser: row.basicAuthUser ?? undefined,
    source,
  };
}

export async function getTenantDuitkuConfig(tenantId: string): Promise<DuitkuTenantConfigResolved | null> {
  const row = await db.query.tenantDuitkuConfigs.findFirst({
    where: and(eq(tenantDuitkuConfigs.tenantId, tenantId), eq(tenantDuitkuConfigs.isEnabled, true)),
  });
  if (!row?.merchantCode?.trim() || !row.apiKeyEncrypted) return null;

  const callbackUrl = row.callbackUrl?.trim() ?? "";
  if (!callbackUrl) return null;

  return {
    merchantCode: row.merchantCode.trim(),
    apiKey: decryptSecret(row.apiKeyEncrypted),
    callbackUrl,
    inquiryUrl: resolveDuitkuInquiryUrl(row.inquiryUrl),
    paymentMethod: row.paymentMethod || "VC",
    source: "tenant",
  };
}

/** Tenant punya payment gateway sendiri yang aktif dan lengkap. */
export async function isTenantDuitkuConfigured(tenantId: string): Promise<boolean> {
  return (await getTenantDuitkuConfig(tenantId)) !== null;
}

export async function getTenantWhatsAppConfig(
  tenantId: string
): Promise<WhatsAppTenantConfigResolved | null> {
  const row = await db.query.tenantWhatsAppConfigs.findFirst({
    where: and(
      eq(tenantWhatsAppConfigs.tenantId, tenantId),
      eq(tenantWhatsAppConfigs.isEnabled, true)
    ),
  });
  if (!row) return null;

  const resolved = resolveWaRow(row, "tenant");
  if (row.provider === "klicknet") {
    const auth = resolveKlicknetAuth({
      basicAuthUser: row.basicAuthUser,
      password: decryptSecret(row.apiTokenEncrypted),
    });
    if (!resolved.apiUrl || !auth.username || !auth.password) return null;
    if (!row.deviceId?.trim()) return null;
  } else if (!resolved.apiUrl || !resolved.apiToken) {
    return null;
  }
  return resolved;
}

export async function getPlatformWhatsAppConfig(): Promise<WhatsAppTenantConfigResolved | null> {
  const row = await db.query.platformWhatsAppConfigs.findFirst({
    where: eq(platformWhatsAppConfigs.id, PLATFORM_WA_ID),
  });
  if (row && row.isEnabled) {
    return resolveWaRow(row, "platform");
  }
  const apiUrl = process.env.WHATSAPP_API_URL ?? "";
  const apiToken = process.env.WHATSAPP_API_TOKEN ?? "";
  if (!apiUrl || !apiToken) return null;
  return { apiUrl, apiToken, provider: "waba", phoneNumberId: "", source: "global" };
}

export async function getPlatformWhatsAppConfigRow() {
  return (
    (await db.query.platformWhatsAppConfigs.findFirst({
      where: eq(platformWhatsAppConfigs.id, PLATFORM_WA_ID),
    })) ?? null
  );
}

export async function upsertPlatformWhatsAppConfig(input: {
  apiUrl: string;
  apiToken?: string;
  provider: "gateway" | "waba" | "klicknet";
  phoneNumberId?: string;
  deviceId?: string;
  basicAuthUser?: string;
  isEnabled: boolean;
}) {
  const current = await getPlatformWhatsAppConfigRow();
  const apiTokenEncrypted =
    input.apiToken && input.apiToken.trim().length > 0
      ? encryptSecret(input.apiToken.trim())
      : current?.apiTokenEncrypted;
  if (!apiTokenEncrypted) throw new Error("Token/password WhatsApp wajib diisi");
  const patch = {
    apiUrl: input.apiUrl.trim(),
    apiTokenEncrypted,
    provider: input.provider,
    phoneNumberId: input.phoneNumberId?.trim() || null,
    deviceId: input.deviceId?.trim() || null,
    basicAuthUser: input.basicAuthUser?.trim() || null,
    isEnabled: input.isEnabled,
    updatedAt: new Date(),
  };
  if (current) {
    await db
      .update(platformWhatsAppConfigs)
      .set(patch)
      .where(eq(platformWhatsAppConfigs.id, PLATFORM_WA_ID));
  } else {
    await db.insert(platformWhatsAppConfigs).values({
      id: PLATFORM_WA_ID,
      ...patch,
    });
  }
}

export async function getTenantDuitkuConfigRow(tenantId: string): Promise<TenantDuitkuConfig | null> {
  return (
    (await db.query.tenantDuitkuConfigs.findFirst({
      where: eq(tenantDuitkuConfigs.tenantId, tenantId),
    })) ?? null
  );
}

export async function getTenantWhatsAppConfigRow(
  tenantId: string
): Promise<TenantWhatsAppConfig | null> {
  return (
    (await db.query.tenantWhatsAppConfigs.findFirst({
      where: eq(tenantWhatsAppConfigs.tenantId, tenantId),
    })) ?? null
  );
}

export async function upsertTenantDuitkuConfig(input: {
  tenantId: string;
  merchantCode: string;
  apiKey?: string;
  callbackUrl?: string;
  inquiryUrl?: string;
  paymentMethod?: string;
  isEnabled: boolean;
}) {
  const current = await getTenantDuitkuConfigRow(input.tenantId);
  const apiKeyEncrypted =
    input.apiKey && input.apiKey.trim().length > 0
      ? encryptSecret(input.apiKey.trim())
      : current?.apiKeyEncrypted;
  if (!apiKeyEncrypted) throw new Error("API key Duitku wajib diisi");
  const patch = {
    merchantCode: input.merchantCode.trim(),
    apiKeyEncrypted,
    callbackUrl: input.callbackUrl?.trim() || null,
    inquiryUrl: input.inquiryUrl?.trim() || null,
    paymentMethod: input.paymentMethod?.trim() || "VC",
    isEnabled: input.isEnabled,
    updatedAt: new Date(),
  };
  if (current) {
    await db
      .update(tenantDuitkuConfigs)
      .set(patch)
      .where(eq(tenantDuitkuConfigs.tenantId, input.tenantId));
  } else {
    await db.insert(tenantDuitkuConfigs).values({
      id: newId("tdk"),
      tenantId: input.tenantId,
      createdAt: new Date(),
      ...patch,
    });
  }
}

export async function upsertTenantWhatsAppConfig(input: {
  tenantId: string;
  apiUrl: string;
  apiToken?: string;
  provider: "gateway" | "waba" | "klicknet";
  phoneNumberId?: string;
  deviceId?: string;
  basicAuthUser?: string;
  isEnabled: boolean;
}) {
  const current = await getTenantWhatsAppConfigRow(input.tenantId);
  const apiTokenEncrypted =
    input.apiToken && input.apiToken.trim().length > 0
      ? encryptSecret(input.apiToken.trim())
      : current?.apiTokenEncrypted;
  if (!apiTokenEncrypted) throw new Error("Token WhatsApp wajib diisi");
  const patch = {
    apiUrl: input.apiUrl.trim(),
    apiTokenEncrypted,
    provider: input.provider,
    phoneNumberId: input.phoneNumberId?.trim() || null,
    deviceId: input.deviceId?.trim() || null,
    basicAuthUser: input.basicAuthUser?.trim() || null,
    isEnabled: input.isEnabled,
    updatedAt: new Date(),
  };
  if (current) {
    await db
      .update(tenantWhatsAppConfigs)
      .set(patch)
      .where(eq(tenantWhatsAppConfigs.tenantId, input.tenantId));
  } else {
    await db.insert(tenantWhatsAppConfigs).values({
      id: newId("twp"),
      tenantId: input.tenantId,
      createdAt: new Date(),
      ...patch,
    });
  }
}

/** Siapkan baris Klicknet tenant — SERVER KLICKnet dari .env; device ID tetap per tenant. */
export async function ensureTenantKlicknetFromEnv(
  tenantId: string
): Promise<TenantWhatsAppConfig | null> {
  const row = await getTenantWhatsAppConfigRow(tenantId);

  if (row?.provider === "klicknet") {
    const auth = resolveKlicknetAuth({
      basicAuthUser: row.basicAuthUser,
      password: decryptSecret(row.apiTokenEncrypted),
    });
    if (auth.username && auth.password) return row;
  }

  if (!isGowaFullyFromEnv()) {
    return row?.provider === "klicknet" ? row : null;
  }

  if (row && row.provider !== "klicknet") return null;

  await upsertTenantWhatsAppConfig({
    tenantId,
    provider: "klicknet",
    apiUrl: getGowaBaseUrlFromEnv(),
    apiToken: getGowaBasicPasswordFromEnv(),
    basicAuthUser: getGowaBasicUserFromEnv(),
    isEnabled: row?.isEnabled ?? false,
    deviceId: row?.deviceId ?? undefined,
  });

  const updated = await getTenantWhatsAppConfigRow(tenantId);
  return updated?.provider === "klicknet" ? updated : null;
}

/** Siapkan baris Klicknet platform — auto-simpan dari .env jika belum ada / provider salah. */
export async function ensurePlatformKlicknetFromEnv() {
  const row = await getPlatformWhatsAppConfigRow();

  if (row?.provider === "klicknet") {
    const auth = resolveKlicknetAuth({
      basicAuthUser: row.basicAuthUser,
      password: decryptSecret(row.apiTokenEncrypted),
    });
    if (auth.username && auth.password) return row;
  }

  if (!isGowaFullyFromEnv()) {
    return row?.provider === "klicknet" ? row : null;
  }

  await upsertPlatformWhatsAppConfig({
    provider: "klicknet",
    apiUrl: getGowaBaseUrlFromEnv(),
    apiToken: getGowaBasicPasswordFromEnv(),
    basicAuthUser: getGowaBasicUserFromEnv(),
    isEnabled: row?.isEnabled ?? true,
    deviceId: row?.deviceId ?? undefined,
  });

  const updated = await getPlatformWhatsAppConfigRow();
  return updated?.provider === "klicknet" ? updated : null;
}

