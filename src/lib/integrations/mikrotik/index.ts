import { mikrotikMock } from "./mock";
import { mikrotikReal } from "./real";
import type { MikrotikClient } from "./types";

export type { MikrotikClient, RouterCredentials, RouterStatus } from "./types";

/** Factory: pilih implementasi berdasar env MIKROTIK_DRIVER. */
export function getMikrotikClient(): MikrotikClient {
  switch (process.env.MIKROTIK_DRIVER) {
    case "real":
      return mikrotikReal;
    case "mock":
    default:
      return mikrotikMock;
  }
}
