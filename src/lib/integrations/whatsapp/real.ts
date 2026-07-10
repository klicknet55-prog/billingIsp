import { createLogger } from "@/lib/logger";
import {
  getPlatformWhatsAppConfig,
  getTenantWhatsAppConfig,
} from "@/features/integrations/service";
import { klicknetSendText } from "./klicknet";
import { resolveKlicknetAuth } from "./config";
import type { WhatsAppClient } from "./types";
import type { WhatsAppTenantConfigResolved } from "@/features/integrations/service";

const log = createLogger("whatsapp:real");

function normalizePhone(raw: string): string {
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("0")) p = `62${p.slice(1)}`;
  return p;
}

async function sendWithConfig(
  to: string,
  body: string,
  cfg: WhatsAppTenantConfigResolved
) {
  const provider = cfg.provider;
  const url = cfg.apiUrl.trim();
  const klicknetAuth =
    provider === "klicknet"
      ? resolveKlicknetAuth({
          basicAuthUser: cfg.basicAuthUser,
          password: cfg.apiToken,
        })
      : null;
  const token =
    provider === "klicknet" ? klicknetAuth?.password ?? "" : cfg.apiToken;

  if (!url || !token) {
    throw new Error("Konfigurasi WhatsApp tidak lengkap.");
  }
  const phone = normalizePhone(to);

  if (provider === "klicknet") {
    await klicknetSendText(
      {
        baseUrl: url,
        username: klicknetAuth?.username ?? cfg.basicAuthUser ?? "",
        password: token,
        deviceId: cfg.deviceId,
      },
      phone,
      body
    );
    return;
  }

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

async function sendText(to: string, body: string, tenantId?: string) {
  if (tenantId) {
    const tenantCfg = await getTenantWhatsAppConfig(tenantId);
    if (!tenantCfg) {
      throw new Error(
        "WhatsApp tenant belum dikonfigurasi. Atur di ISP → Integrasi → WhatsApp API."
      );
    }
    await sendWithConfig(to, body, tenantCfg);
    return;
  }

  const platformCfg = await getPlatformWhatsAppConfig();
  if (!platformCfg) {
    throw new Error(
      "WhatsApp platform belum dikonfigurasi. Atur di Superadmin → Integrasi atau .env."
    );
  }
  await sendWithConfig(to, body, platformCfg);
}

export const whatsappReal: WhatsAppClient = {
  async sendOtp(phone, code, tenantId) {
    await sendText(phone, `Kode OTP NetManage Anda: ${code}. Berlaku 5 menit.`, tenantId);
  },
  async sendNotification(phone, message, tenantId) {
    await sendText(phone, message, tenantId);
  },
};
