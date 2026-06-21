import { createLogger } from "@/lib/logger";
import type {
  ConnectionSnapshot,
  HotspotUserInput,
  MikrotikClient,
  MikrotikStatusOptions,
  PppoeSecretInput,
  RouterCredentials,
  RouterStatus,
} from "./types";

const log = createLogger("mikrotik:mock");

/** Implementasi simulasi Mikrotik tanpa router fisik. */
export const mikrotikMock: MikrotikClient = {
  async getStatus(router: RouterCredentials, _opts?: MikrotikStatusOptions): Promise<RouterStatus> {
    log.debug(`getStatus ${router.ipAddress}`);
    // Simulasi: router dianggap online jika IP tidak diawali "10.99".
    const online = !router.ipAddress.startsWith("10.99");
    return {
      online,
      uptime: online ? "3d 12h" : undefined,
      activeUsers: online ? Math.floor(Math.random() * 50) : 0,
    };
  },
  async upsertPppoeSecret(router: RouterCredentials, input: PppoeSecretInput) {
    log.info(
      `upsertPppoeSecret ${input.username} profile=${input.profile} mode=${router.connectionMode}`
    );
  },
  async upsertHotspotUser(router: RouterCredentials, input: HotspotUserInput) {
    log.info(
      `upsertHotspotUser ${input.username} profile=${input.profile} mode=${router.connectionMode}`
    );
  },
  async isolate(router, ref) {
    log.info(`isolate ${ref.connectionType}:${ref.username} @ ${router.ipAddress}`);
  },
  async activate(router, ref) {
    log.info(`activate ${ref.connectionType}:${ref.username} @ ${router.ipAddress}`);
  },
  async listProfiles(_router, type) {
    return type === "pppoe"
      ? ["default", "pppoe-10mb", "pppoe-20mb", "isolir"]
      : ["default", "hs-10mb", "hs-20mb", "isolir"];
  },
  async removeConnectionUser(router, ref) {
    log.info(`removeConnectionUser ${ref.connectionType}:${ref.username} @ ${router.ipAddress}`);
    return { removed: true, exists: true };
  },
  async snapshotConnections(_router, type): Promise<ConnectionSnapshot[]> {
    log.debug(`snapshotConnections mock ${type}`);
    return [];
  },
};
