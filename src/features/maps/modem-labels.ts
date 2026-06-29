import type { ConnectionSnapshot, ModemMapStatus } from "@/lib/integrations/mikrotik/types";

export function resolveModemStatus(input: {
  connectionUsername: string | null | undefined;
  isIsolated: boolean;
  snapshotByUser: Map<string, ConnectionSnapshot>;
  routerReachable: boolean;
  mockMode?: boolean;
}): ModemMapStatus {
  const username = input.connectionUsername?.trim();
  if (!username || !input.routerReachable) return "unknown";
  if (input.isIsolated) return "isolir";

  const snap = input.snapshotByUser.get(username);
  if (snap) {
    if (snap.disabled) return "isolir";
    if (snap.isOnline) return "aktif";
    return "gangguan";
  }

  if (input.mockMode) {
    return username.length % 2 === 0 ? "aktif" : "gangguan";
  }
  return "unknown";
}

export const MODEM_STATUS_LABEL: Record<ModemMapStatus, string> = {
  aktif: "Aktif",
  isolir: "Isolir",
  gangguan: "Gangguan",
  unknown: "Unknown",
};

export const MODEM_STATUS_COLOR: Record<ModemMapStatus, string> = {
  aktif: "#16a34a",
  isolir: "#dc2626",
  gangguan: "#ea580c",
  unknown: "#6b7280",
};
