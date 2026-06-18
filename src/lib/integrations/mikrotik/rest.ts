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

export async function restGetStatus(r: RouterCredentials): Promise<RouterStatus> {
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
    log.error("getStatus gagal", msg);
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
    await setPppoeDisabled(r, ref.username, true);
    return;
  }
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
