export type RouterConnectionMode = "rest" | "legacy_api";

export interface RouterCredentials {
  connectionMode: RouterConnectionMode;
  ipAddress: string;
  apiPort: string;
  username: string;
  password: string;
}

export interface RouterStatus {
  online: boolean;
  uptime?: string;
  activeUsers?: number;
}

export interface PppoeSecretInput {
  username: string;
  password: string;
  profile: string;
  remoteAddress?: string;
  comment?: string;
}

export interface HotspotUserInput {
  username: string;
  password: string;
  profile: string;
  comment?: string;
}

/**
 * Kontrak komunikasi dengan Mikrotik RouterOS.
 * Implementasi nyata (REST/SSH) tinggal mengikuti interface ini.
 */
export interface MikrotikClient {
  getStatus(router: RouterCredentials): Promise<RouterStatus>;
  upsertPppoeSecret(router: RouterCredentials, input: PppoeSecretInput): Promise<void>;
  upsertHotspotUser(router: RouterCredentials, input: HotspotUserInput): Promise<void>;
  /** Isolir pelanggan (mis. pindah ke profile "isolir"). */
  isolate(
    router: RouterCredentials,
    ref: { connectionType: "pppoe" | "hotspot"; username: string }
  ): Promise<void>;
  /** Aktifkan kembali koneksi pelanggan. */
  activate(
    router: RouterCredentials,
    ref: { connectionType: "pppoe" | "hotspot"; username: string }
  ): Promise<void>;
}
