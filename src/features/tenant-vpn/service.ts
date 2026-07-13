import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantVpnAccounts, tenants } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  getVpnApiClient,
  getVpnIpPool,
  getVpnListenPortStart,
  getVpnPublicHost,
} from "@/lib/integrations/vpn-api";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";
import {
  assertSaasFeature,
  getTenantVpnQuota,
} from "@/features/tenants/saas-access";

const log = createLogger("tenant-vpn");

function ipToLong(ip: string): number {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    throw new Error(`Alamat IP tidak valid: ${ip}`);
  }
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function longToIp(n: number): string {
  return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
}

function generateVpnPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

function sanitizeVpnUsernamePart(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return cleaned || "tenant";
}

async function allocateStaticIp(usedIps: Set<string>): Promise<string> {
  const pool = getVpnIpPool();
  const start = ipToLong(pool.start);
  const end = ipToLong(pool.end);
  if (start > end) {
    throw new Error("Pool IP VPN tidak valid (VPN_IP_POOL_START > VPN_IP_POOL_END).");
  }

  for (let n = start; n <= end; n++) {
    const ip = longToIp(n);
    if (!usedIps.has(ip)) return ip;
  }
  throw new Error("Pool IP VPN penuh. Hubungi administrator platform.");
}

async function allocateListenPort(usedPorts: Set<number>): Promise<number> {
  const base = getVpnListenPortStart();
  for (let offset = 0; offset < 10_000; offset++) {
    const port = base + offset;
    if (!usedPorts.has(port)) return port;
  }
  throw new Error("Pool port VPN penuh. Hubungi administrator platform.");
}

async function buildUniqueVpnUsername(tenantId: string, domain?: string | null): Promise<string> {
  const base = domain
    ? `nm-${sanitizeVpnUsernamePart(domain)}`
    : `nm-${tenantId.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase()}`;

  const existing = await db.query.tenantVpnAccounts.findMany({
    columns: { vpnUsername: true },
  });
  const taken = new Set(existing.map((r) => r.vpnUsername));

  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("Tidak dapat membuat username VPN unik.");
}

export async function listTenantVpns(tenantId: string) {
  return db.query.tenantVpnAccounts.findMany({
    where: eq(tenantVpnAccounts.tenantId, tenantId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function getTenantVpn(tenantId: string, id: string) {
  return db.query.tenantVpnAccounts.findFirst({
    where: and(eq(tenantVpnAccounts.tenantId, tenantId), eq(tenantVpnAccounts.id, id)),
  });
}

export async function revealTenantVpnPassword(tenantId: string, id: string): Promise<string> {
  const row = await getTenantVpn(tenantId, id);
  if (!row) throw new Error("Akun VPN tidak ditemukan.");
  return decryptSecret(row.passwordEncrypted);
}

export interface CreateTenantVpnInput {
  tenantId: string;
  label?: string;
  destinationPort: 443 | 8728;
}

export interface CreateTenantVpnResult {
  id: string;
  label: string | null;
  vpnUsername: string;
  password: string;
  staticIp: string;
  listenPort: number;
  destinationPort: number;
  publicHost: string;
  endpoint: string;
}

export async function createTenantVpn(
  input: CreateTenantVpnInput
): Promise<CreateTenantVpnResult> {
  await assertSaasFeature(input.tenantId, "vpn_mikrotik");
  const quota = await getTenantVpnQuota(input.tenantId);
  if (!quota.allowed) {
    throw new Error(
      `Kuota VPN habis (${quota.used}/${quota.maxVpn}). Upgrade paket atau hapus akun VPN yang tidak dipakai.`
    );
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, input.tenantId),
    columns: { domain: true },
  });

  const allAccounts = await db.query.tenantVpnAccounts.findMany({
    columns: { staticIp: true, listenPort: true },
  });
  const usedIps = new Set(allAccounts.map((r) => r.staticIp));
  const usedPorts = new Set(allAccounts.map((r) => r.listenPort));

  const staticIp = await allocateStaticIp(usedIps);
  const listenPort = await allocateListenPort(usedPorts);
  const vpnUsername = await buildUniqueVpnUsername(input.tenantId, tenant?.domain);
  const password = generateVpnPassword();
  const id = newId("tvpn");
  const portForwardName = `nm-${input.tenantId.slice(-8)}-${id.slice(-8)}`;

  const client = getVpnApiClient();
  log.info(`Membuat user VPN ${vpnUsername} → ${staticIp}`);

  await client.createUser({ username: vpnUsername, password, ip: staticIp });
  try {
    await client.createPortForwarding({
      name: portForwardName,
      protocol: "tcp",
      listenPort,
      destinationIp: staticIp,
      destinationPort: input.destinationPort,
    });
  } catch (err) {
    try {
      await client.deleteUser(vpnUsername);
    } catch (rollbackErr) {
      log.error(`Rollback user VPN gagal: ${vpnUsername}`, rollbackErr);
    }
    throw err;
  }

  await db.insert(tenantVpnAccounts).values({
    id,
    tenantId: input.tenantId,
    label: input.label?.trim() || null,
    vpnUsername,
    passwordEncrypted: encryptSecret(password),
    staticIp,
    portForwardName,
    listenPort,
    destinationPort: input.destinationPort,
    status: "active",
  });

  const publicHost = getVpnPublicHost();
  return {
    id,
    label: input.label?.trim() || null,
    vpnUsername,
    password,
    staticIp,
    listenPort,
    destinationPort: input.destinationPort,
    publicHost,
    endpoint: `${publicHost}:${listenPort}`,
  };
}

async function removeVpnFromRemote(row: {
  vpnUsername: string;
  portForwardName: string;
}): Promise<void> {
  const client = getVpnApiClient();
  try {
    await client.deletePortForwarding(row.portForwardName);
  } catch (err) {
    log.warn(`Hapus port-forward ${row.portForwardName} gagal`, err);
  }
  try {
    await client.deleteUser(row.vpnUsername);
  } catch (err) {
    log.warn(`Hapus user VPN ${row.vpnUsername} gagal`, err);
  }
}

export async function deleteTenantVpn(tenantId: string, id: string): Promise<void> {
  const row = await getTenantVpn(tenantId, id);
  if (!row) throw new Error("Akun VPN tidak ditemukan.");

  await removeVpnFromRemote(row);

  await db
    .delete(tenantVpnAccounts)
    .where(and(eq(tenantVpnAccounts.tenantId, tenantId), eq(tenantVpnAccounts.id, id)));
}

export async function toggleTenantVpn(
  tenantId: string,
  id: string,
  enabled: boolean
): Promise<void> {
  const row = await getTenantVpn(tenantId, id);
  if (!row) throw new Error("Akun VPN tidak ditemukan.");

  const client = getVpnApiClient();
  if (enabled) {
    await client.enableUser(row.vpnUsername);
  } else {
    await client.disableUser(row.vpnUsername);
  }

  await db
    .update(tenantVpnAccounts)
    .set({
      status: enabled ? "active" : "disabled",
      updatedAt: new Date(),
    })
    .where(and(eq(tenantVpnAccounts.tenantId, tenantId), eq(tenantVpnAccounts.id, id)));
}

/** Hapus semua akun VPN tenant di server VPN (DB dihapus terpisah). */
export async function purgeTenantVpnAccounts(tenantId: string): Promise<void> {
  const rows = await listTenantVpns(tenantId);
  for (const row of rows) {
    await removeVpnFromRemote(row);
  }
}
