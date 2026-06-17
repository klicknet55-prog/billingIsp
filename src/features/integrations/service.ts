import "server-only";
import { and, eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import {
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  type TenantDuitkuConfig,
  type TenantWhatsAppConfig,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils";

export interface DuitkuTenantConfigResolved {
  merchantCode: string;
  apiKey: string;
  callbackUrl: string;
  inquiryUrl: string;
  paymentMethod: string;
  source: "tenant" | "global";
}

export interface WhatsAppTenantConfigResolved {
  apiUrl: string;
  apiToken: string;
  provider: "gateway" | "waba";
  phoneNumberId: string;
  source: "tenant" | "global";
}

export async function getTenantDuitkuConfig(tenantId: string): Promise<DuitkuTenantConfigResolved | null> {
  const row = await db.query.tenantDuitkuConfigs.findFirst({
    where: and(eq(tenantDuitkuConfigs.tenantId, tenantId), eq(tenantDuitkuConfigs.isEnabled, true)),
  });
  if (row) {
    return {
      merchantCode: row.merchantCode,
      apiKey: decryptSecret(row.apiKeyEncrypted),
      callbackUrl: row.callbackUrl ?? process.env.DUITKU_CALLBACK_URL ?? "",
      inquiryUrl:
        row.inquiryUrl ??
        process.env.DUITKU_INQUIRY_URL ??
        "https://passport.duitku.com/webapi/api/merchant/v2/inquiry",
      paymentMethod: row.paymentMethod || "VC",
      source: "tenant",
    };
  }
  const merchantCode = process.env.DUITKU_MERCHANT_CODE ?? "";
  const apiKey = process.env.DUITKU_API_KEY ?? "";
  if (!merchantCode || !apiKey) return null;
  return {
    merchantCode,
    apiKey,
    callbackUrl: process.env.DUITKU_CALLBACK_URL ?? "",
    inquiryUrl:
      process.env.DUITKU_INQUIRY_URL ??
      "https://passport.duitku.com/webapi/api/merchant/v2/inquiry",
    paymentMethod: process.env.DUITKU_PAYMENT_METHOD ?? "VC",
    source: "global",
  };
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
  if (row) {
    return {
      apiUrl: row.apiUrl,
      apiToken: decryptSecret(row.apiTokenEncrypted),
      provider: row.provider,
      phoneNumberId: row.phoneNumberId ?? "",
      source: "tenant",
    };
  }
  const apiUrl = process.env.WHATSAPP_API_URL ?? "";
  const apiToken = process.env.WHATSAPP_API_TOKEN ?? "";
  if (!apiUrl || !apiToken) return null;
  return { apiUrl, apiToken, provider: "waba", phoneNumberId: "", source: "global" };
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
  provider: "gateway" | "waba";
  phoneNumberId?: string;
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

