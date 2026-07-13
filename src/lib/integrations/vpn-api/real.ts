import { getVpnApiCredentials } from "./config";
import { vpnApiFetch } from "./http";
import type {
  CreatePortForwardingInput,
  CreateVpnUserInput,
  VpnApiClient,
} from "./types";

export const vpnApiReal: VpnApiClient = {
  async createUser(input: CreateVpnUserInput) {
    const creds = getVpnApiCredentials();
    await vpnApiFetch(creds, "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: input.username,
        password: input.password,
        ip: input.ip,
      }),
    });
  },

  async deleteUser(username: string) {
    const creds = getVpnApiCredentials();
    await vpnApiFetch(creds, `/users/${encodeURIComponent(username)}`, {
      method: "DELETE",
    });
  },

  async disableUser(username: string) {
    const creds = getVpnApiCredentials();
    await vpnApiFetch(creds, `/users/${encodeURIComponent(username)}/disable`, {
      method: "POST",
    });
  },

  async enableUser(username: string) {
    const creds = getVpnApiCredentials();
    await vpnApiFetch(creds, `/users/${encodeURIComponent(username)}/enable`, {
      method: "POST",
    });
  },

  async createPortForwarding(input: CreatePortForwardingInput) {
    const creds = getVpnApiCredentials();
    await vpnApiFetch(creds, "/port-forwardings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        protocol: input.protocol,
        listen_port: input.listenPort,
        destination_ip: input.destinationIp,
        destination_port: input.destinationPort,
      }),
    });
  },

  async deletePortForwarding(name: string) {
    const creds = getVpnApiCredentials();
    await vpnApiFetch(creds, `/port-forwardings/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },
};
