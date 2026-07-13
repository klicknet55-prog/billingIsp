import { getVpnDriver } from "./config";
import { vpnApiMock } from "./mock";
import { vpnApiReal } from "./real";
import type { VpnApiClient } from "./types";

export type {
  CreatePortForwardingInput,
  CreateVpnUserInput,
  VpnApiClient,
} from "./types";

export {
  getVpnApiCredentials,
  getVpnDriver,
  getVpnIpPool,
  getVpnListenPortStart,
  getVpnPublicHost,
} from "./config";

/** Factory: pilih implementasi berdasar env VPN_DRIVER. */
export function getVpnApiClient(): VpnApiClient {
  return getVpnDriver() === "real" ? vpnApiReal : vpnApiMock;
}
