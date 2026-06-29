"use server";

import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/features/auth/actions";
import { createTenantApiKey, revokeTenantApiKey } from "./service";

export type ApiKeyActionState = ActionState & {
  plainKey?: string;
  keyPrefix?: string;
};

export async function createTenantApiKeyAction(
  _prev: ApiKeyActionState,
  formData: FormData
): Promise<ApiKeyActionState> {
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const label = String(formData.get("label") ?? "").trim();

  if (label.length > 80) {
    return { error: "Label maksimal 80 karakter." };
  }

  const created = await createTenantApiKey(tenantId, label || "Default");
  return {
    ok: true,
    plainKey: created.plain,
    keyPrefix: created.prefix,
  };
}

export async function revokeTenantApiKeyAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId!;
  const keyId = String(formData.get("keyId") ?? "").trim();
  if (!keyId) return { error: "Key tidak valid." };

  const revoked = await revokeTenantApiKey(tenantId, keyId);
  if (!revoked) return { error: "API key tidak ditemukan atau sudah dicabut." };
  return { ok: true };
}
