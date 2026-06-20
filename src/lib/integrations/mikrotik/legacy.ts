import { RouterOSAPI } from "node-routeros";
import { createLogger } from "@/lib/logger";
import type {
  HotspotUserInput,
  PppoeSecretInput,
  RouterCredentials,
  RouterStatus,
} from "./types";

const log = createLogger("mikrotik:legacy");

function port(r: RouterCredentials): number {
  const p = parseInt(r.apiPort, 10);
  return Number.isFinite(p) && p > 0 ? p : 8728;
}

async function withApi<T>(r: RouterCredentials, fn: (api: RouterOSAPI) => Promise<T>): Promise<T> {
  const api = new RouterOSAPI({
    host: r.ipAddress,
    port: port(r),
    user: r.username,
    password: r.password,
    timeout: 15,
  });
  try {
    await api.connect();
    return await fn(api);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const detail = msg.trim() || "Koneksi ditolak atau timeout";
    log.error(`Koneksi legacy ${r.ipAddress}:${port(r)}`, detail);
    throw new Error(`Tidak dapat terhubung ke Mikrotik (${r.ipAddress}): ${detail}`);
  } finally {
    await api.close().catch(() => {});
  }
}

function rowId(row: Record<string, unknown>): string | null {
  const id = row[".id"];
  return typeof id === "string" ? id : null;
}

export async function legacyGetStatus(r: RouterCredentials): Promise<RouterStatus> {
  try {
    return await withApi(r, async (api) => {
      const resource = (await api.write("/system/resource/print")) as Record<string, unknown>[];
      const uptime = typeof resource[0]?.uptime === "string" ? resource[0].uptime : undefined;
      let activeUsers = 0;
      try {
        const active = (await api.write("/ppp/active/print")) as unknown[];
        activeUsers = active.length;
      } catch {
        /* router hotspot-only mungkin tidak punya ppp */
      }
      return { online: true, uptime, activeUsers };
    });
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
  await withApi(r, async (api) => {
    const found = (await api.write("/ppp/secret/print", [`?name=${input.username}`])) as Record<
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
      await api.write("/ppp/secret/set", [`=.id=${id}`, ...args.slice(1)]);
      return;
    }
    await api.write("/ppp/secret/add", args);
  });
}

export async function legacyUpsertHotspotUser(r: RouterCredentials, input: HotspotUserInput) {
  await withApi(r, async (api) => {
    const found = (await api.write("/ip/hotspot/user/print", [`?name=${input.username}`])) as Record<
      string,
      unknown
    >[];
    const args = [
      `=name=${input.username}`,
      `=password=${input.password}`,
      `=profile=${input.profile}`,
    ];
    if (input.comment) args.push(`=comment=${input.comment}`);

    const id = found[0] ? rowId(found[0]) : null;
    if (id) {
      await api.write("/ip/hotspot/user/set", [`=.id=${id}`, ...args.slice(1)]);
      return;
    }
    await api.write("/ip/hotspot/user/add", args);
  });
}

async function setPppoeDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  await withApi(r, async (api) => {
    const found = (await api.write("/ppp/secret/print", [`?name=${name}`])) as Record<
      string,
      unknown
    >[];
    const id = found[0] ? rowId(found[0]) : null;
    if (!id) {
      log.warn(`Secret PPP '${name}' tidak ditemukan`);
      return;
    }
    await api.write("/ppp/secret/set", [`=.id=${id}`, `=disabled=${disabled ? "yes" : "no"}`]);
  });
}

async function setHotspotDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  await withApi(r, async (api) => {
    const found = (await api.write("/ip/hotspot/user/print", [`?name=${name}`])) as Record<
      string,
      unknown
    >[];
    const id = found[0] ? rowId(found[0]) : null;
    if (!id) {
      log.warn(`User Hotspot '${name}' tidak ditemukan`);
      return;
    }
    await api.write("/ip/hotspot/user/set", [`=.id=${id}`, `=disabled=${disabled ? "yes" : "no"}`]);
  });
}

export async function legacyIsolate(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
) {
  if (ref.connectionType === "pppoe") {
    await setPppoeDisabled(r, ref.username, true);
    return;
  }
  await setHotspotDisabled(r, ref.username, true);
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
    const found = (await api.write(cmd, [`?name=${ref.username}`])) as Record<string, unknown>[];
    const id = found[0] ? rowId(found[0]) : null;
    if (!id) {
      log.info(`User '${ref.username}' tidak ada — lewati hapus`);
      return { removed: false, exists: false };
    }
    await api.write(removeCmd, [`=.id=${id}`]);
    return { removed: true, exists: true };
  });
}

export async function legacyListProfiles(
  r: RouterCredentials,
  type: "pppoe" | "hotspot"
): Promise<string[]> {
  const cmd = type === "pppoe" ? "/ppp/profile/print" : "/ip/hotspot/user/profile/print";
  return withApi(r, async (api) => {
    const rows = (await api.write(cmd)) as Record<string, unknown>[];
    return [...new Set(rows.map((row) => String(row.name ?? "").trim()).filter(Boolean))].sort();
  });
}
