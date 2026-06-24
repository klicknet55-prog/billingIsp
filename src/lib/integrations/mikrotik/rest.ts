import { createLogger } from "@/lib/logger";
import { formatFetchError, readRouterOsError, routerOsFetch } from "./http";
import type {
  HotspotUserInput,
  PppoeSecretInput,
  RouterCredentials,
  RouterStatus,
} from "./types";

const log = createLogger("mikrotik:rest");

function baseUrl(r: RouterCredentials) {
  const port = r.apiPort?.trim();
  const host = port ? `${r.ipAddress}:${port}` : r.ipAddress;
  return `https://${host}/rest`;
}

/** Path resource by RouterOS internal id (*5) — jangan encode asterisk. */
function resourceUrl(base: string, id: string) {
  return `${base}/${id}`;
}

function authHeader(r: RouterCredentials) {
  const token = Buffer.from(`${r.username}:${r.password}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

async function assertOk(res: Response, ctx: string) {
  if (res.ok) return;
  throw new Error(await readRouterOsError(res, ctx));
}

async function findConnectionUserId(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
): Promise<string | null> {
  return ref.connectionType === "pppoe"
    ? findSecretId(r, ref.username)
    : findHotspotUserId(r, ref.username);
}

/** Hapus via POST /remove (lebih stabil di RouterOS daripada HTTP DELETE). */
async function removeByPost(
  r: RouterCredentials,
  collectionPath: string,
  id: string,
  ctx: string
) {
  const res = await routerOsFetch(`${baseUrl(r)}${collectionPath}/remove`, {
    method: "POST",
    headers: authHeader(r),
    body: JSON.stringify({ ".id": id }),
  });
  await assertOk(res, ctx);
}

async function findSecretId(r: RouterCredentials, name: string): Promise<string | null> {
  const res = await routerOsFetch(`${baseUrl(r)}/ppp/secret?name=${encodeURIComponent(name)}`, {
    headers: authHeader(r),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ ".id": string }>;
  return data[0]?.[".id"] ?? null;
}

async function findHotspotUserId(r: RouterCredentials, name: string): Promise<string | null> {
  const res = await routerOsFetch(
    `${baseUrl(r)}/ip/hotspot/user?name=${encodeURIComponent(name)}`,
    { headers: authHeader(r) }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ ".id": string }>;
  return data[0]?.[".id"] ?? null;
}

async function setPppoeDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  const id = await findSecretId(r, name);
  if (!id) {
    log.warn(`Secret PPP '${name}' tidak ditemukan`);
    return;
  }
  const res = await routerOsFetch(resourceUrl(`${baseUrl(r)}/ppp/secret`, id), {
    method: "PATCH",
    headers: authHeader(r),
    body: JSON.stringify({ disabled }),
  });
  await assertOk(res, `Nonaktifkan PPPoE '${name}'`);
}

async function setHotspotDisabled(r: RouterCredentials, name: string, disabled: boolean) {
  const id = await findHotspotUserId(r, name);
  if (!id) {
    log.warn(`User Hotspot '${name}' tidak ditemukan`);
    return;
  }
  const res = await routerOsFetch(resourceUrl(`${baseUrl(r)}/ip/hotspot/user`, id), {
    method: "PATCH",
    headers: authHeader(r),
    body: JSON.stringify({ disabled }),
  });
  await assertOk(res, `Nonaktifkan Hotspot '${name}'`);
}

async function removePppoeActiveSessions(r: RouterCredentials, name: string) {
  const res = await routerOsFetch(`${baseUrl(r)}/ppp/active?name=${encodeURIComponent(name)}`, {
    headers: authHeader(r),
  });
  if (!res.ok) return;
  const rows = (await res.json()) as Array<{ ".id"?: string }>;
  for (const row of rows) {
    const id = row[".id"];
    if (id) await removeByPost(r, "/ppp/active", id, `Putus sesi PPPoE '${name}'`);
  }
}

async function removeHotspotActiveSessions(r: RouterCredentials, name: string) {
  let res = await routerOsFetch(
    `${baseUrl(r)}/ip/hotspot/active?user=${encodeURIComponent(name)}`,
    { headers: authHeader(r) }
  );
  if (!res.ok) return;
  let rows = (await res.json()) as Array<{ ".id"?: string }>;
  if (rows.length === 0) {
    res = await routerOsFetch(
      `${baseUrl(r)}/ip/hotspot/active?name=${encodeURIComponent(name)}`,
      { headers: authHeader(r) }
    );
    if (!res.ok) return;
    rows = (await res.json()) as Array<{ ".id"?: string }>;
  }
  for (const row of rows) {
    const id = row[".id"];
    if (id) await removeByPost(r, "/ip/hotspot/active", id, `Putus sesi Hotspot '${name}'`);
  }
}

export async function restGetStatus(
  r: RouterCredentials,
  opts?: { quiet?: boolean }
): Promise<RouterStatus> {
  try {
    const res = await routerOsFetch(`${baseUrl(r)}/system/resource`, { headers: authHeader(r) });
    if (!res.ok) {
      return { online: false, error: await readRouterOsError(res, "Cek status router") };
    }
    const data = (await res.json()) as { uptime?: string };
    let activeUsers = 0;
    try {
      const act = await routerOsFetch(`${baseUrl(r)}/ppp/active`, { headers: authHeader(r) });
      if (act.ok) activeUsers = ((await act.json()) as unknown[]).length;
    } catch {
      /* abaikan */
    }
    return { online: true, uptime: data.uptime, activeUsers };
  } catch (err) {
    const msg = formatFetchError(err);
    if (opts?.quiet) {
      log.debug("getStatus offline (quiet)", msg);
    } else {
      log.error("getStatus gagal", msg);
    }
    return { online: false, error: msg };
  }
}

export async function restUpsertPppoeSecret(r: RouterCredentials, input: PppoeSecretInput) {
  const id = await findSecretId(r, input.username);
  const payload: Record<string, string> = {
    name: input.username,
    password: input.password,
    profile: input.profile,
    service: "pppoe",
  };
  if (input.remoteAddress) payload["remote-address"] = input.remoteAddress;
  if (input.comment) payload.comment = input.comment;

  const res = id
    ? await routerOsFetch(resourceUrl(`${baseUrl(r)}/ppp/secret`, id), {
        method: "PATCH",
        headers: authHeader(r),
        body: JSON.stringify(payload),
      })
    : await routerOsFetch(`${baseUrl(r)}/ppp/secret`, {
        method: "PUT",
        headers: authHeader(r),
        body: JSON.stringify(payload),
      });
  await assertOk(res, `Sinkron PPPoE '${input.username}'`);
}

export async function restUpsertHotspotUser(r: RouterCredentials, input: HotspotUserInput) {
  const id = await findHotspotUserId(r, input.username);
  const payload: Record<string, string> = {
    name: input.username,
    password: input.password,
    profile: input.profile,
  };
  if (input.comment) payload.comment = input.comment;

  const res = id
    ? await routerOsFetch(resourceUrl(`${baseUrl(r)}/ip/hotspot/user`, id), {
        method: "PATCH",
        headers: authHeader(r),
        body: JSON.stringify(payload),
      })
    : await routerOsFetch(`${baseUrl(r)}/ip/hotspot/user`, {
        method: "PUT",
        headers: authHeader(r),
        body: JSON.stringify(payload),
      });
  await assertOk(res, `Sinkron Hotspot '${input.username}'`);
}

export async function restIsolate(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
) {
  if (ref.connectionType === "pppoe") {
    await removePppoeActiveSessions(r, ref.username);
    await setPppoeDisabled(r, ref.username, true);
    return;
  }
  await removeHotspotActiveSessions(r, ref.username);
  await setHotspotDisabled(r, ref.username, true);
}

export async function restActivate(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
) {
  if (ref.connectionType === "pppoe") {
    await setPppoeDisabled(r, ref.username, false);
    return;
  }
  await setHotspotDisabled(r, ref.username, false);
}

export async function restConnectionUserExists(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
): Promise<boolean> {
  try {
    const id = await findConnectionUserId(r, ref);
    return id != null;
  } catch {
    return false;
  }
}

export async function restRemoveConnectionUser(
  r: RouterCredentials,
  ref: { connectionType: "pppoe" | "hotspot"; username: string }
): Promise<{ removed: boolean; exists: boolean }> {
  const collectionPath = ref.connectionType === "pppoe" ? "/ppp/secret" : "/ip/hotspot/user";
  const label = ref.connectionType === "pppoe" ? "PPPoE" : "Hotspot";

  const id = await findConnectionUserId(r, ref);
  if (!id) {
    log.info(`User ${label} '${ref.username}' tidak ada — lewati hapus`);
    return { removed: false, exists: false };
  }

  await removeByPost(r, collectionPath, id, `Hapus ${label} '${ref.username}'`);
  return { removed: true, exists: true };
}

export async function restListProfiles(
  r: RouterCredentials,
  type: "pppoe" | "hotspot"
): Promise<string[]> {
  const path = type === "pppoe" ? "/ppp/profile" : "/ip/hotspot/user/profile";
  const res = await routerOsFetch(`${baseUrl(r)}${path}`, { headers: authHeader(r) });
  await assertOk(res, `Load profile ${type}`);
  const data = (await res.json()) as Array<{ name?: string }>;
  return [...new Set(data.map((row) => row.name?.trim()).filter(Boolean) as string[])].sort();
}

function parseDisabled(value: unknown): boolean {
  return value === true || value === "true" || value === "yes";
}

export async function restSnapshotConnections(
  r: RouterCredentials,
  type: "pppoe" | "hotspot"
): Promise<import("./types").ConnectionSnapshot[]> {
  if (type === "pppoe") {
    const [secretsRes, activeRes] = await Promise.all([
      routerOsFetch(`${baseUrl(r)}/ppp/secret`, { headers: authHeader(r) }),
      routerOsFetch(`${baseUrl(r)}/ppp/active`, { headers: authHeader(r) }),
    ]);
    if (!secretsRes.ok) {
      throw new Error(await readRouterOsError(secretsRes, "Load PPPoE secrets"));
    }
    const secrets = (await secretsRes.json()) as Array<{ name?: string; disabled?: unknown }>;
    const activeNames = new Set<string>();
    if (activeRes.ok) {
      const active = (await activeRes.json()) as Array<{ name?: string }>;
      for (const row of active) {
        if (row.name?.trim()) activeNames.add(row.name.trim());
      }
    }
    return secrets
      .filter((s) => s.name?.trim())
      .map((s) => ({
        username: s.name!.trim(),
        disabled: parseDisabled(s.disabled),
        isOnline: activeNames.has(s.name!.trim()),
      }));
  }

  const [usersRes, activeRes] = await Promise.all([
    routerOsFetch(`${baseUrl(r)}/ip/hotspot/user`, { headers: authHeader(r) }),
    routerOsFetch(`${baseUrl(r)}/ip/hotspot/active`, { headers: authHeader(r) }),
  ]);
  if (!usersRes.ok) {
    throw new Error(await readRouterOsError(usersRes, "Load Hotspot users"));
  }
  const users = (await usersRes.json()) as Array<{ name?: string; disabled?: unknown }>;
  const activeNames = new Set<string>();
  if (activeRes.ok) {
    const active = (await activeRes.json()) as Array<{ user?: string; name?: string }>;
    for (const row of active) {
      const n = (row.user ?? row.name)?.trim();
      if (n) activeNames.add(n);
    }
  }
  return users
    .filter((u) => u.name?.trim())
    .map((u) => ({
      username: u.name!.trim(),
      disabled: parseDisabled(u.disabled),
      isOnline: activeNames.has(u.name!.trim()),
    }));
}
