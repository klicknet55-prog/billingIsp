import { createLogger } from "@/lib/logger";
import type {
  HotspotUserInput,
  MikrotikClient,
  PppoeSecretInput,
  RouterCredentials,
  RouterStatus,
} from "./types";

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
  const port = r.apiPort?.trim();
  const host = port ? `${r.ipAddress}:${port}` : r.ipAddress;
  return `https://${host}/rest`;
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

async function findHotspotUserId(r: RouterCredentials, name: string): Promise<string | null> {
  const res = await fetch(`${baseUrl(r)}/ip/hotspot/user?name=${encodeURIComponent(name)}`, {
    headers: authHeader(r),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ ".id": string }>;
  return data[0]?.[".id"] ?? null;
}

function isLegacyMode(r: RouterCredentials) {
  return r.connectionMode === "legacy_api";
}

async function setPppoeDisabled(r: RouterCredentials, name: string, disabled: boolean) {
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

async function setHotspotDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  const id = await findHotspotUserId(r, name);
  if (!id) {
    log.warn(`User Hotspot '${name}' tidak ditemukan`);
    return;
  }
  await fetch(`${baseUrl(r)}/ip/hotspot/user/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: authHeader(r),
    body: JSON.stringify({ disabled: disabled ? "true" : "false" }),
  });
}

async function upsertPppoeSecretReal(r: RouterCredentials, input: PppoeSecretInput) {
  const id = await findSecretId(r, input.username);
  const payload: Record<string, string> = {
    name: input.username,
    password: input.password,
    profile: input.profile,
  };
  if (input.remoteAddress) payload["remote-address"] = input.remoteAddress;
  if (input.comment) payload.comment = input.comment;

  if (id) {
    await fetch(`${baseUrl(r)}/ppp/secret/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeader(r),
      body: JSON.stringify(payload),
    });
    return;
  }

  await fetch(`${baseUrl(r)}/ppp/secret`, {
    method: "PUT",
    headers: authHeader(r),
    body: JSON.stringify(payload),
  });
}

async function upsertHotspotUserReal(r: RouterCredentials, input: HotspotUserInput) {
  const id = await findHotspotUserId(r, input.username);
  const payload: Record<string, string> = {
    name: input.username,
    password: input.password,
    profile: input.profile,
  };
  if (input.comment) payload.comment = input.comment;

  if (id) {
    await fetch(`${baseUrl(r)}/ip/hotspot/user/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeader(r),
      body: JSON.stringify(payload),
    });
    return;
  }

  await fetch(`${baseUrl(r)}/ip/hotspot/user`, {
    method: "PUT",
    headers: authHeader(r),
    body: JSON.stringify(payload),
  });
}

export const mikrotikReal: MikrotikClient = {
  async getStatus(r: RouterCredentials): Promise<RouterStatus> {
    if (isLegacyMode(r)) {
      log.warn(`legacy_api mode terdeteksi pada ${r.ipAddress}. Status realtime belum tersedia.`);
      return { online: false };
    }
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
  async upsertPppoeSecret(r, input) {
    if (isLegacyMode(r)) {
      log.warn(`legacy_api mode: sinkron PPPoE ${input.username} dilewati (MVP).`);
      return;
    }
    await upsertPppoeSecretReal(r, input);
  },
  async upsertHotspotUser(r, input) {
    if (isLegacyMode(r)) {
      log.warn(`legacy_api mode: sinkron Hotspot ${input.username} dilewati (MVP).`);
      return;
    }
    await upsertHotspotUserReal(r, input);
  },
  async isolate(r, ref) {
    if (isLegacyMode(r)) {
      log.warn(`legacy_api mode: isolate ${ref.connectionType}:${ref.username} dilewati (MVP).`);
      return;
    }
    if (ref.connectionType === "pppoe") {
      await setPppoeDisabled(r, ref.username, true);
      return;
    }
    await setHotspotDisabled(r, ref.username, true);
  },
  async activate(r, ref) {
    if (isLegacyMode(r)) {
      log.warn(`legacy_api mode: activate ${ref.connectionType}:${ref.username} dilewati (MVP).`);
      return;
    }
    if (ref.connectionType === "pppoe") {
      await setPppoeDisabled(r, ref.username, false);
      return;
    }
    await setHotspotDisabled(r, ref.username, false);
  },
};
