"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/features/auth/actions";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/db/schema";
import { executeWebhookDelivery } from "./deliver";
import { upsertTenantWebhook } from "./service";

export type WebhookActionState = ActionState & { plainSecret?: string };

function parseEvents(formData: FormData): WebhookEvent[] {
  const selected = formData.getAll("events").map(String) as WebhookEvent[];
  return selected.filter((e) => WEBHOOK_EVENTS.includes(e));
}

export async function saveTenantWebhookConfigAction(
  _prev: WebhookActionState,
  formData: FormData
): Promise<WebhookActionState> {
  const user = await requireUser(["owner", "admin"]);
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "URL webhook wajib diisi." };

  try {
    const saved = await upsertTenantWebhook({
      tenantId: user.tenantId!,
      url,
      events: parseEvents(formData),
      isEnabled: formData.get("isEnabled") === "on",
      regenerateSecret: formData.get("regenerateSecret") === "on",
    });
    revalidatePath("/dashboard/integrasi");
    return { ok: true, plainSecret: saved.plainSecret };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testTenantWebhookAction(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  try {
    const result = await executeWebhookDelivery(user.tenantId!, "webhook.test", {
      message: "Event uji dari NetManage",
    });
    if (result.skipped === "webhook_disabled") {
      return { error: "Webhook belum diaktifkan. Centang Aktifkan dan simpan konfigurasi." };
    }
    if (result.skipped === "circuit_open") {
      return { error: "Webhook dinonaktifkan sementara karena terlalu banyak kegagalan. Periksa URL endpoint." };
    }
    if (!result.delivered) {
      return { error: "Pengiriman event uji gagal. Lihat log delivery di bawah." };
    }
    revalidatePath("/dashboard/integrasi");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
