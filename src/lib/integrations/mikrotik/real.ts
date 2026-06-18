import type {
  HotspotUserInput,
  MikrotikClient,
  PppoeSecretInput,
  RouterCredentials,
  RouterStatus,
} from "./types";
import {
  legacyActivate,
  legacyGetStatus,
  legacyIsolate,
  legacyListProfiles,
  legacyRemoveConnectionUser,
  legacyUpsertHotspotUser,
  legacyUpsertPppoeSecret,
} from "./legacy";
import {
  restActivate,
  restGetStatus,
  restIsolate,
  restListProfiles,
  restRemoveConnectionUser,
  restUpsertHotspotUser,
  restUpsertPppoeSecret,
} from "./rest";

function isLegacyMode(r: RouterCredentials) {
  return r.connectionMode === "legacy_api";
}

/** Implementasi Mikrotik: REST (RouterOS v7+) atau Legacy API (port 8728). */
export const mikrotikReal: MikrotikClient = {
  getStatus(r: RouterCredentials): Promise<RouterStatus> {
    return isLegacyMode(r) ? legacyGetStatus(r) : restGetStatus(r);
  },
  upsertPppoeSecret(r: RouterCredentials, input: PppoeSecretInput) {
    return isLegacyMode(r) ? legacyUpsertPppoeSecret(r, input) : restUpsertPppoeSecret(r, input);
  },
  upsertHotspotUser(r: RouterCredentials, input: HotspotUserInput) {
    return isLegacyMode(r) ? legacyUpsertHotspotUser(r, input) : restUpsertHotspotUser(r, input);
  },
  isolate(r, ref) {
    return isLegacyMode(r) ? legacyIsolate(r, ref) : restIsolate(r, ref);
  },
  activate(r, ref) {
    return isLegacyMode(r) ? legacyActivate(r, ref) : restActivate(r, ref);
  },
  listProfiles(r, type) {
    return isLegacyMode(r) ? legacyListProfiles(r, type) : restListProfiles(r, type);
  },
  removeConnectionUser(r, ref) {
    return isLegacyMode(r) ? legacyRemoveConnectionUser(r, ref) : restRemoveConnectionUser(r, ref);
  },
};
