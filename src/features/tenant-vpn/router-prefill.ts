/** Prefill form router dari akun VPN — pakai port NAT publik, bukan port API internal Mikrotik. */
export function buildVpnRouterPrefill(
  publicHost: string,
  listenPort: number,
  destinationPort: 443 | 8728
) {
  return {
    ipAddress: publicHost,
    apiPort: String(listenPort),
    connectionMode: destinationPort === 8728 ? ("legacy_api" as const) : ("rest" as const),
  };
}
