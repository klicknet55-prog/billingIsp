/** URL layanan eksternal TunnelHost (WA Gateway & VPN REST Mikrotik). */
export const TUNNELHOST_LINKS = {
  waGatewayRegister:
    process.env.NEXT_PUBLIC_TUNNELHOST_WA_REGISTER_URL?.trim() ||
    "https://vpn.tunnelhost.my.id/",
  mikrotikVpnRestRegister:
    process.env.NEXT_PUBLIC_TUNNELHOST_MIKROTIK_VPN_URL?.trim() ||
    "https://vpn.tunnelhost.my.id/",
} as const;
