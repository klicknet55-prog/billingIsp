import { createLogger } from "@/lib/logger";
import type { VpnApiCredentials } from "./types";

const log = createLogger("vpn-api");

function authHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export async function vpnApiFetch(
  creds: VpnApiCredentials,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${normalizeBaseUrl(creds.baseUrl)}${path}`;
  const headers: Record<string, string> = {
    Authorization: authHeader(creds.username, creds.password),
    ...(init?.headers as Record<string, string> | undefined),
  };

  try {
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.warn(`VPN API ${init?.method ?? "GET"} ${path} → ${res.status}`, {
        body: body.slice(0, 200),
      });
      throw new Error(`VPN API gagal (${res.status}): ${body || res.statusText}`);
    }
    return res;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("VPN API gagal")) throw err;
    const e = err instanceof Error ? err : new Error(String(err));
    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();
    throw new Error(
      `Tidak dapat terhubung ke VPN API (${host}). Periksa VPN_API_BASE_URL dan akses jaringan server billing. Detail: ${e.message}`
    );
  }
}
