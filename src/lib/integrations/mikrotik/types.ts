export interface RouterCredentials {
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

/**
 * Kontrak komunikasi dengan Mikrotik RouterOS.
 * Implementasi nyata (REST/SSH) tinggal mengikuti interface ini.
 */
export interface MikrotikClient {
  getStatus(router: RouterCredentials): Promise<RouterStatus>;
  /** Isolir pelanggan (mis. pindah ke profile "isolir"). */
  isolate(router: RouterCredentials, ipOrUser: string): Promise<void>;
  /** Aktifkan kembali koneksi pelanggan. */
  activate(router: RouterCredentials, ipOrUser: string): Promise<void>;
}
