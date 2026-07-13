import "server-only";
import type { VpnApiCredentials } from "./types";

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function getVpnDriver(): "mock" | "real" {
  return process.env.VPN_DRIVER === "real" ? "real" : "mock";
}

export function getVpnApiCredentials(): VpnApiCredentials {
  const baseUrl = process.env.VPN_API_BASE_URL?.trim() ?? "";
  const username = process.env.VPN_API_USERNAME?.trim() ?? "";
  const password = process.env.VPN_API_PASSWORD ?? "";
  if (!baseUrl || !username || !password) {
    throw new Error(
      "VPN_API_BASE_URL, VPN_API_USERNAME, dan VPN_API_PASSWORD wajib diisi saat VPN_DRIVER=real."
    );
  }
  return { baseUrl, username, password };
}

export function getVpnPublicHost(): string {
  return process.env.VPN_API_PUBLIC_HOST?.trim() || "127.0.0.1";
}

export function getVpnIpPool(): { start: string; end: string } {
  return {
    start: process.env.VPN_IP_POOL_START?.trim() || "10.10.10.10",
    end: process.env.VPN_IP_POOL_END?.trim() || "10.10.10.250",
  };
}

export function getVpnListenPortStart(): number {
  return parseIntEnv("VPN_LISTEN_PORT_START", 18_000);
}
