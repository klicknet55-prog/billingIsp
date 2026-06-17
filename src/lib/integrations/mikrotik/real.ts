import { createLogger } from "@/lib/logger";
import type { MikrotikClient, RouterCredentials, RouterStatus } from "./types";

const log = createLogger("mikrotik:real");

/**
 * Implementasi RouterOS v7 REST API (dependency-free, via fetch).
 * Prasyarat: fitur `/ip service rest` aktif & sertifikat HTTPS valid
 * (atau set NODE_TLS_REJECT_UNAUTHORIZED untuk uji coba).
 *
 * Untuk RouterOS v6 (binary API port 8728), ganti dengan library
 * `node-routeros` tanpa mengubah interface MikrotikClient.
 */
function baseUrl(r: RouterCredentials) {
  return `https://${r.ipAddress}/rest`;
}

function authHeader(r: RouterCredentials) {
  const token = Buffer.from(`${r.username}:${r.password}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

async function findSecretId(r: RouterCredentials, name: string): Promise<string | null> {
  const res = await fetch(`${baseUrl(r)}/ppp/secret?name=${encodeURIComponent(name)}`, {
    headers: authHeader(r),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ ".id": string }>;
  return data[0]?.[".id"] ?? null;
}

async function setDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  const id = await findSecretId(r, name);
  if (!id) {
    log.warn(`Secret PPP '${name}' tidak ditemukan`);
    return;
  }
  await fetch(`${baseUrl(r)}/ppp/secret/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: authHeader(r),
    body: JSON.stringify({ disabled: disabled ? "true" : "false" }),
  });
}

export const mikrotikReal: MikrotikClient = {
  async getStatus(r: RouterCredentials): Promise<RouterStatus> {
    try {
      const res = await fetch(`${baseUrl(r)}/system/resource`, { headers: authHeader(r) });
      if (!res.ok) return { online: false };
      const data = (await res.json()) as { uptime?: string };
      let activeUsers = 0;
      try {
        const act = await fetch(`${baseUrl(r)}/ppp/active`, { headers: authHeader(r) });
        if (act.ok) activeUsers = ((await act.json()) as unknown[]).length;
      } catch {
        /* abaikan */
      }
      return { online: true, uptime: data.uptime, activeUsers };
    } catch (err) {
      log.error("getStatus gagal", (err as Error).message);
      return { online: false };
    }
  },
  async isolate(r, ipOrUser) {
    await setDisabled(r, ipOrUser, true);
  },
  async activate(r, ipOrUser) {
    await setDisabled(r, ipOrUser, false);
  },
};
