import type {
  HotspotUserInput,
  MikrotikClient,
  MikrotikStatusOptions,
  PppoeSecretInput,
  RouterCredentials,
  RouterStatus,
} from "./types";
import {
  legacyActivate,
  legacyConnectionUserExists,
  legacyGetStatus,
  legacyIsolate,
  legacyListProfiles,
  legacyRemoveConnectionUser,
  legacySnapshotConnections,
  legacyUpsertHotspotUser,
  legacyUpsertPppoeSecret,
} from "./legacy";
import {
  restActivate,
  restConnectionUserExists,
  restGetStatus,
  restIsolate,
  restListProfiles,
  restRemoveConnectionUser,
  restSnapshotConnections,
  restUpsertHotspotUser,
  restUpsertPppoeSecret,
} from "./rest";

function isLegacyMode(r: RouterCredentials) {
  return r.connectionMode === "legacy_api";
}

/** Implementasi Mikrotik: REST (RouterOS v7+) atau Legacy API (port 8728). */
export const mikrotikReal: MikrotikClient = {
  getStatus(r: RouterCredentials, opts?: MikrotikStatusOptions): Promise<RouterStatus> {
    return isLegacyMode(r) ? legacyGetStatus(r, opts) : restGetStatus(r, opts);
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
  connectionUserExists(r, ref) {
    return isLegacyMode(r) ? legacyConnectionUserExists(r, ref) : restConnectionUserExists(r, ref);
  },
  snapshotConnections(r, type) {
    return isLegacyMode(r) ? legacySnapshotConnections(r, type) : restSnapshotConnections(r, type);
  },
};
