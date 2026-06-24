import { RouterOSAPI } from "node-routeros";
import { createLogger } from "@/lib/logger";
import { isMikrotikEmptyReplyError, isMikrotikUnregisteredTagError, formatMikrotikLegacyError } from "./errors";
import { ensureLegacyApiEmptyReplyPatch } from "./legacy-patch";
import type {
  HotspotUserInput,
  PppoeSecretInput,
  RouterCredentials,
  RouterStatus,
} from "./types";

const log = createLogger("mikrotik:legacy");

ensureLegacyApiEmptyReplyPatch();

async function legacyWrite(
  api: RouterOSAPI,
  ...args: Parameters<RouterOSAPI["write"]>
): Promise<unknown> {
  try {
    return await api.write(...args);
  } catch (err) {
    if (isMikrotikEmptyReplyError(err)) return [];
    if (isMikrotikUnregisteredTagError(err)) return [];
    throw err;
  }
}

function port(r: RouterCredentials): number {
  const p = parseInt(r.apiPort, 10);
  return Number.isFinite(p) && p > 0 ? p : 8728;
}

const LEGACY_API_TIMEOUT_SEC = 30;
const LEGACY_WRITE_TIMEOUT_SEC = 45;

/** Cegah error event node-routeros menjadi uncaughtException. */
function attachLegacyApiErrorGuard(api: RouterOSAPI): () => void {
  const handler = (err: unknown) => {
    log.warn(
      "Legacy API error event",
      err instanceof Error ? err.message : String(err)
    );
  };
  api.on("error", handler);
  return () => api.removeListener("error", handler);
}

async function withApi<T>(
  r: RouterCredentials,
  fn: (api: RouterOSAPI) => Promise<T>,
  opts?: { quiet?: boolean; timeoutSec?: number }
): Promise<T> {
  const timeoutSec = opts?.timeoutSec ?? LEGACY_API_TIMEOUT_SEC;
  const api = new RouterOSAPI({
    host: r.ipAddress,
    port: port(r),
    user: r.username,
    password: r.password,
    timeout: timeoutSec,
  });
  const detachErrorGuard = attachLegacyApiErrorGuard(api);

  try {
    await api.connect();
    return await fn(api);
  } catch (err) {
    const detail = formatMikrotikLegacyError(err);
    if (!opts?.quiet) {
      log.error(`Koneksi legacy ${r.ipAddress}:${port(r)}`, detail);
    }
    throw new Error(`Tidak dapat terhubung ke Mikrotik (${r.ipAddress}): ${detail}`);
  } finally {
    detachErrorGuard();
    await api.close().catch(() => {});
  }
}

function rowId(row: Record<string, unknown>): string | null {
  const id = row[".id"];
  return typeof id === "string" ? id : null;
}

export async function legacyGetStatus(
  r: RouterCredentials,
  opts?: { quiet?: boolean }
): Promise<RouterStatus> {
  try {
    return await withApi(
      r,
      async (api) => {
        const resource = (await legacyWrite(api,"/system/resource/print")) as Record<string, unknown>[];
        const uptime = typeof resource[0]?.uptime === "string" ? resource[0].uptime : undefined;
        let activeUsers = 0;
        try {
          const active = (await legacyWrite(api,"/ppp/active/print")) as unknown[];
          activeUsers = active.length;
        } catch {
          /* router hotspot-only mungkin tidak punya ppp */
        }
        return { online: true, uptime, activeUsers };
      },
      opts
    );
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const msg = raw.replace(
      /^Tidak dapat terhubung ke Mikrotik \([^)]+\):\s*/i,
      ""
    ).trim() || raw.trim() || "Koneksi ditolak atau timeout";
    const hint =
      msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.includes("timeout")
        ? " Pastikan server aplikasi dapat menjangkau IP router (VPN/LAN)."
        : "";
    return { online: false, error: `${msg}${hint}` };
  }
}

export async function legacyUpsertPppoeSecret(r: RouterCredentials, input: PppoeSecretInput) {
  await withApi(
    r,
    async (api) => {
      const found = (await legacyWrite(api, "/ppp/secret/print", [`?name=${input.username}`])) as Record<
        string,
        unknown
      >[];
      const args = [
        `=name=${input.username}`,
        `=password=${input.password}`,
        `=profile=${input.profile}`,
        `=service=pppoe`,
      ];
      if (input.remoteAddress) args.push(`=remote-address=${input.remoteAddress}`);
      if (input.comment) args.push(`=comment=${input.comment}`);

      const id = found[0] ? rowId(found[0]) : null;
      if (id) {
        await legacyWrite(api, "/ppp/secret/set", [`=.id=${id}`, ...args.slice(1)]);
        return;
      }
      await legacyWrite(api, "/ppp/secret/add", args);
    },
    { timeoutSec: LEGACY_WRITE_TIMEOUT_SEC }
  );
}

export async function legacyUpsertHotspotUser(r: RouterCredentials, input: HotspotUserInput) {
  await withApi(
    r,
    async (api) => {
      const found = (await legacyWrite(api, "/ip/hotspot/user/print", [
        `?name=${input.username}`,
      ])) as Record<string, unknown>[];
      const args = [
        `=name=${input.username}`,
        `=password=${input.password}`,
        `=profile=${input.profile}`,
      ];
      if (input.comment) args.push(`=comment=${input.comment}`);

      const id = found[0] ? rowId(found[0]) : null;
      if (id) {
        await legacyWrite(api, "/ip/hotspot/user/set", [`=.id=${id}`, ...args.slice(1)]);
        return;
      }
      await legacyWrite(api, "/ip/hotspot/user/add", args);
    },
    { timeoutSec: LEGACY_WRITE_TIMEOUT_SEC }
  );
}

export async function legacyConnectionUserExists(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
): Promise<boolean> {
  const cmd =
    ref.connectionType === "pppoe" ? "/ppp/secret/print" : "/ip/hotspot/user/print";
  try {
    return await withApi(
      r,
      async (api) => {
        const found = (await legacyWrite(api, cmd, [`?name=${ref.username}`])) as Record<
          string,
          unknown
        >[];
        return found.length > 0 && !!rowId(found[0] ?? {});
      },
      { quiet: true, timeoutSec: 15 }
    );
  } catch {
    return false;
  }
}

async function setPppoeDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  await withApi(r, async (api) => {
    const found = (await legacyWrite(api,"/ppp/secret/print", [`?name=${name}`])) as Record<
      string,
      unknown
    >[];
    const id = found[0] ? rowId(found[0]) : null;
    if (!id) {
      log.warn(`Secret PPP '${name}' tidak ditemukan`);
      return;
    }
    await legacyWrite(api,"/ppp/secret/set", [`=.id=${id}`, `=disabled=${disabled ? "yes" : "no"}`]);
  });
}

async function setHotspotDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  await withApi(r, async (api) => {
    const found = (await legacyWrite(api,"/ip/hotspot/user/print", [`?name=${name}`])) as Record<
      string,
      unknown
    >[];
    const id = found[0] ? rowId(found[0]) : null;
    if (!id) {
      log.warn(`User Hotspot '${name}' tidak ditemukan`);
      return;
    }
    await legacyWrite(api,"/ip/hotspot/user/set", [`=.id=${id}`, `=disabled=${disabled ? "yes" : "no"}`]);
  });
}

async function removeLegacyPppoeActive(api: RouterOSAPI, name: string) {
  const active = (await legacyWrite(api, "/ppp/active/print", [`?name=${name}`])) as Record<
    string,
    unknown
  >[];
  for (const row of active) {
    const id = rowId(row);
    if (id) await legacyWrite(api, "/ppp/active/remove", [`=.id=${id}`]);
  }
}

async function removeLegacyHotspotActive(api: RouterOSAPI, name: string) {
  let active = (await legacyWrite(api, "/ip/hotspot/active/print", [`?user=${name}`])) as Record<
    string,
    unknown
  >[];
  if (active.length === 0) {
    active = (await legacyWrite(api, "/ip/hotspot/active/print", [`?name=${name}`])) as Record<
      string,
      unknown
    >[];
  }
  for (const row of active) {
    const id = rowId(row);
    if (id) await legacyWrite(api, "/ip/hotspot/active/remove", [`=.id=${id}`]);
  }
}

export async function legacyIsolate(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
) {
  if (ref.connectionType === "pppoe") {
    await withApi(r, async (api) => {
      await removeLegacyPppoeActive(api, ref.username);
      const found = (await legacyWrite(api, "/ppp/secret/print", [`?name=${ref.username}`])) as Record<
        string,
        unknown
      >[];
      const id = found[0] ? rowId(found[0]) : null;
      if (!id) {
        log.warn(`Secret PPP '${ref.username}' tidak ditemukan`);
        return;
      }
      await legacyWrite(api, "/ppp/secret/set", [`=.id=${id}`, "=disabled=yes"]);
    });
    return;
  }
  await withApi(r, async (api) => {
    await removeLegacyHotspotActive(api, ref.username);
    const found = (await legacyWrite(api, "/ip/hotspot/user/print", [`?name=${ref.username}`])) as Record<
      string,
      unknown
    >[];
    const id = found[0] ? rowId(found[0]) : null;
    if (!id) {
      log.warn(`User Hotspot '${ref.username}' tidak ditemukan`);
      return;
    }
    await legacyWrite(api, "/ip/hotspot/user/set", [`=.id=${id}`, "=disabled=yes"]);
  });
}

export async function legacyActivate(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
) {
  if (ref.connectionType === "pppoe") {
    await setPppoeDisabled(r, ref.username, false);
    return;
  }
  await setHotspotDisabled(r, ref.username, false);
}

export async function legacyRemoveConnectionUser(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
): Promise<{ removed: boolean; exists: boolean }> {
  const cmd =
    ref.connectionType === "pppoe" ? "/ppp/secret/print" : "/ip/hotspot/user/print";
  const removeCmd =
    ref.connectionType === "pppoe" ? "/ppp/secret/remove" : "/ip/hotspot/user/remove";

  return withApi(r, async (api) => {
    const found = (await legacyWrite(api,cmd, [`?name=${ref.username}`])) as Record<string, unknown>[];
    const id = found[0] ? rowId(found[0]) : null;
    if (!id) {
      log.info(`User '${ref.username}' tidak ada — lewati hapus`);
      return { removed: false, exists: false };
    }
    await legacyWrite(api,removeCmd, [`=.id=${id}`]);
    return { removed: true, exists: true };
  });
}

export async function legacyListProfiles(
  r: RouterCredentials,
  type: "pppoe" | "hotspot"
): Promise<string[]> {
  const cmd = type === "pppoe" ? "/ppp/profile/print" : "/ip/hotspot/user/profile/print";
  return withApi(r, async (api) => {
    const rows = (await legacyWrite(api,cmd)) as Record<string, unknown>[];
    return [...new Set(rows.map((row) => String(row.name ?? "").trim()).filter(Boolean))].sort();
  });
}

function parseLegacyDisabled(value: unknown): boolean {
  return value === true || value === "true" || value === "yes";
}

export async function legacySnapshotConnections(
  r: RouterCredentials,
  type: "pppoe" | "hotspot"
): Promise<import("./types").ConnectionSnapshot[]> {
  return withApi(r, async (api) => {
    if (type === "pppoe") {
      const secrets = (await legacyWrite(api,"/ppp/secret/print")) as Record<string, unknown>[];
      let active: Record<string, unknown>[] = [];
      try {
        active = (await legacyWrite(api,"/ppp/active/print")) as Record<string, unknown>[];
      } catch {
        /* hotspot-only router */
      }
      const activeNames = new Set(
        active.map((row) => String(row.name ?? "").trim()).filter(Boolean)
      );
      return secrets
        .map((s) => String(s.name ?? "").trim())
        .filter(Boolean)
        .map((name) => {
          const row = secrets.find((s) => String(s.name ?? "").trim() === name)!;
          return {
            username: name,
            disabled: parseLegacyDisabled(row.disabled),
            isOnline: activeNames.has(name),
          };
        });
    }

    const users = (await legacyWrite(api,"/ip/hotspot/user/print")) as Record<string, unknown>[];
    let active: Record<string, unknown>[] = [];
    try {
      active = (await legacyWrite(api,"/ip/hotspot/active/print")) as Record<string, unknown>[];
    } catch {
      /* ignore */
    }
    const activeNames = new Set(
      active
        .map((row) => String(row.user ?? row.name ?? "").trim())
        .filter(Boolean)
    );
    return users
      .map((u) => String(u.name ?? "").trim())
      .filter(Boolean)
      .map((name) => {
        const row = users.find((u) => String(u.name ?? "").trim() === name)!;
        return {
          username: name,
          disabled: parseLegacyDisabled(row.disabled),
          isOnline: activeNames.has(name),
        };
      });
  });
}
