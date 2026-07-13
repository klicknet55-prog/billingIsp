import { createLogger } from "@/lib/logger";
import type {
  CreatePortForwardingInput,
  CreateVpnUserInput,
  VpnApiClient,
} from "./types";

const log = createLogger("vpn-api:mock");

const users = new Map<string, { ip: string }>();
const portForwards = new Map<string, CreatePortForwardingInput>();

export const vpnApiMock: VpnApiClient = {
  async createUser(input: CreateVpnUserInput) {
    users.set(input.username, { ip: input.ip });
    log.info(`[mock] create user ${input.username} → ${input.ip}`);
  },

  async deleteUser(username: string) {
    users.delete(username);
    log.info(`[mock] delete user ${username}`);
  },

  async disableUser(username: string) {
    log.info(`[mock] disable user ${username}`);
  },

  async enableUser(username: string) {
    log.info(`[mock] enable user ${username}`);
  },

  async createPortForwarding(input: CreatePortForwardingInput) {
    portForwards.set(input.name, input);
    log.info(
      `[mock] port-forward ${input.name}: :${input.listenPort} → ${input.destinationIp}:${input.destinationPort}`
    );
  },

  async deletePortForwarding(name: string) {
    portForwards.delete(name);
    log.info(`[mock] delete port-forward ${name}`);
  },
};
