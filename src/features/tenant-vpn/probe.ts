import "server-only";
import { connect } from "node:net";

export type VpnPortProbeResult = "open" | "refused" | "timeout" | "error";

/** Cek apakah port NAT publik dapat dijangkau dari server billing. */
export function probeVpnListenPort(
  host: string,
  port: number,
  timeoutMs = 5000
): Promise<VpnPortProbeResult> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: timeoutMs });

    const finish = (result: VpnPortProbeResult) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.on("connect", () => finish("open"));
    socket.on("timeout", () => finish("timeout"));
    socket.on("error", (err: NodeJS.ErrnoException) => {
      finish(err.code === "ECONNREFUSED" ? "refused" : "error");
    });
  });
}

export function describeVpnPortProbe(result: VpnPortProbeResult): string {
  switch (result) {
    case "open":
      return "Port NAT dapat dijangkau dari server billing.";
    case "refused":
      return "Port terbuka tetapi koneksi ditolak — pastikan tunnel L2TP Mikrotik aktif dan API router hidup.";
    case "timeout":
      return "Timeout — buka port NAT (18000–19000) di firewall server VPN dan pastikan rule iptables aktif.";
    default:
      return "Gagal memeriksa port — periksa DNS/host publik VPN.";
  }
}
