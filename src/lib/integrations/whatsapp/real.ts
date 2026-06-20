import { createLogger } from "@/lib/logger";
import { getTenantWhatsAppConfig } from "@/features/integrations/service";
import type { WhatsAppClient } from "./types";

const log = createLogger("whatsapp:real");

/**
 * Implementasi WhatsApp Business API (WABA Cloud API).
 * WHATSAPP_API_URL: endpoint messages, mis.
 *   https://graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages
 * WHATSAPP_API_TOKEN: access token permanen.
 */
function normalizePhone(raw: string): string {
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("0")) p = `62${p.slice(1)}`;
  return p;
}

async function sendText(to: string, body: string, tenantId?: string) {
  const tenantCfg = tenantId ? await getTenantWhatsAppConfig(tenantId) : null;
  const url = tenantCfg?.apiUrl ?? process.env.WHATSAPP_API_URL ?? "";
  const token = tenantCfg?.apiToken ?? process.env.WHATSAPP_API_TOKEN ?? "";
  const provider = tenantCfg?.provider ?? "waba";
  if (!url || !token) {
    throw new Error(
      "WhatsApp belum dikonfigurasi. Isi di ISP → Integrasi, atau set WHATSAPP_API_URL & WHATSAPP_API_TOKEN di .env. Untuk development, gunakan WHATSAPP_DRIVER=mock."
    );
  }
  const phone = normalizePhone(to);

  // Mode gateway siap pakai: GET ...?phone=...&message=...&secret=...
  if (provider === "gateway") {
    const u = new URL(url);
    u.searchParams.set("phone", phone);
    u.searchParams.set("message", body);
    u.searchParams.set("secret", token);
    const gatewayRes = await fetch(u.toString(), { method: "GET" });
    if (!gatewayRes.ok) {
      const detail = await gatewayRes.text();
      log.error(`Gateway WA gagal ${gatewayRes.status}`, detail);
      throw new Error(`Gateway WhatsApp gagal: ${gatewayRes.status}`);
    }
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    log.error(`Kirim WA gagal ${res.status}`, detail);
    throw new Error(`WhatsApp API gagal: ${res.status}`);
  }
}

export const whatsappReal: WhatsAppClient = {
  async sendOtp(phone, code, tenantId) {
    await sendText(phone, `Kode OTP NetManage Anda: ${code}. Berlaku 5 menit.`, tenantId);
  },
  async sendNotification(phone, message, tenantId) {
    await sendText(phone, message, tenantId);
  },
};
