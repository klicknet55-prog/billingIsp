/** Pisah `host:port` jika endpoint VPN ditempel di field IP router. */
export function normalizeRouterEndpoint(
  ipAddress: string,
  apiPort: string
): { ipAddress: string; apiPort: string } {
  const ip = ipAddress.trim();
  const port = apiPort.trim();

  const bracketMatch = ip.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracketMatch) {
    return {
      ipAddress: bracketMatch[1]!,
      apiPort: bracketMatch[2] ?? port,
    };
  }

  const colonCount = (ip.match(/:/g) ?? []).length;
  if (colonCount === 1 && !ip.includes("://")) {
    const [host, embeddedPort] = ip.split(":");
    if (host && embeddedPort && /^\d+$/.test(embeddedPort)) {
      return { ipAddress: host, apiPort: embeddedPort };
    }
  }

  return { ipAddress: ip, apiPort: port };
}
