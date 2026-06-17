"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/features/auth/actions";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { parseForm } from "@/lib/validation";
import { upsertTenantDuitkuConfig, upsertTenantWhatsAppConfig } from "./service";

const duitkuSchema = z.object({
  merchantCode: z.string().trim().min(1, "Merchant code wajib"),
  apiKey: z.string().optional(),
  callbackUrl: z.string().trim().url("Callback URL tidak valid").optional().or(z.literal("")),
  inquiryUrl: z.string().trim().url("Inquiry URL tidak valid").optional().or(z.literal("")),
  paymentMethod: z.string().trim().min(1, "Payment method wajib"),
  isEnabled: z.string().optional(),
});

const waSchema = z.object({
  provider: z.enum(["gateway", "waba"]).default("gateway"),
  apiUrl: z.string().trim().url("API URL tidak valid"),
  apiToken: z.string().optional(),
  phoneNumberId: z.string().optional(),
  isEnabled: z.string().optional(),
});

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
    revalidatePath("/isp/integrasi");
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
  const parsed = parseForm(waSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  try {
    await upsertTenantWhatsAppConfig({
      tenantId: user.tenantId!,
      provider: parsed.data.provider,
      apiUrl: parsed.data.apiUrl,
      apiToken: parsed.data.apiToken,
      phoneNumberId: parsed.data.phoneNumberId || undefined,
      isEnabled: parsed.data.isEnabled === "on",
    });
    revalidatePath("/isp/integrasi");
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

