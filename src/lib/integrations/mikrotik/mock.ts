import { createLogger } from "@/lib/logger";
import type { MikrotikClient, RouterCredentials, RouterStatus } from "./types";

const log = createLogger("mikrotik:mock");

/** Implementasi simulasi Mikrotik tanpa router fisik. */
export const mikrotikMock: MikrotikClient = {
  async getStatus(router: RouterCredentials): Promise<RouterStatus> {
    log.debug(`getStatus ${router.ipAddress}`);
    // Simulasi: router dianggap online jika IP tidak diawali "10.99".
    const online = !router.ipAddress.startsWith("10.99");
    return {
      online,
      uptime: online ? "3d 12h" : undefined,
      activeUsers: online ? Math.floor(Math.random() * 50) : 0,
    };
  },
  async isolate(router, ipOrUser) {
    log.info(`isolate ${ipOrUser} @ ${router.ipAddress}`);
  },
  async activate(router, ipOrUser) {
    log.info(`activate ${ipOrUser} @ ${router.ipAddress}`);
  },
};
