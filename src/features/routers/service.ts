import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paketInternet, packageTenants, pelanggan, odp, routers, subscriptions, type Router } from "@/lib/db/schema";
import { getMikrotikClient } from "@/lib/integrations/mikrotik";
import type { RouterCredentials } from "@/lib/integrations/mikrotik/types";
import { newId } from "@/lib/utils";

export async function listRouters(tenantId: string): Promise<Router[]> {
  return db.query.routers.findMany({
    where: eq(routers.tenantId, tenantId),
    orderBy: [desc(routers.createdAt)],
  });
}

export function routerToCredentials(router: Router): RouterCredentials {
  return {
    connectionMode: router.connectionMode,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    username: router.username,
    password: router.passwordEncrypted,
  };
}

export async function getRouterForTenant(tenantId: string, id: string) {
  return db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, id)),
  });
}

export async function listMikrotikProfiles(
  tenantId: string,
  routerId: string,
  type: "pppoe" | "hotspot"
): Promise<string[]> {
  const router = await getRouterForTenant(tenantId, routerId);
  if (!router) throw new Error("Router tidak ditemukan.");
  return getMikrotikClient().listProfiles(routerToCredentials(router), type);
}

export interface RouterInput {
  nama: string;
  connectionMode: "rest" | "legacy_api";
  ipAddress: string;
  apiPort: string;
  username: string;
  password: string;
}

export async function createRouter(tenantId: string, input: RouterInput) {
  // Enforce limit router sesuai paket SaaS tenant.
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.status, "active")),
    orderBy: [desc(subscriptions.mulai)],
  });
  if (sub) {
    const pkg = await db.query.packageTenants.findFirst({
      where: eq(packageTenants.id, sub.packageTenantId),
    });
    const maxRouter = pkg?.limitasi?.maxRouter;
    if (typeof maxRouter === "number" && maxRouter > 0) {
      const totalRouter = await db.$count(routers, eq(routers.tenantId, tenantId));
      if (totalRouter >= maxRouter) {
        throw new Error(
          `Limit router paket SaaS tercapai (${totalRouter}/${maxRouter}). Upgrade paket untuk menambah router baru.`
        );
      }
    }
  }

  const id = newId("rtr");
  await db.insert(routers).values({
    id,
    tenantId,
    nama: input.nama,
    connectionMode: input.connectionMode,
    ipAddress: input.ipAddress,
    apiPort: input.apiPort,
    username: input.username,
    // Catatan: di produksi enkripsi password sebelum disimpan.
    passwordEncrypted: input.password,
  });
  return id;
}

export async function updateRouter(
  tenantId: string,
  id: string,
  input: Omit<RouterInput, "password"> & { password?: string }
) {
  const existing = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, id)),
  });
  if (!existing) throw new Error("Router tidak ditemukan.");

  await db
    .update(routers)
    .set({
      nama: input.nama,
      connectionMode: input.connectionMode,
      ipAddress: input.ipAddress,
      apiPort: input.apiPort,
      username: input.username,
      ...(input.password?.trim() ? { passwordEncrypted: input.password.trim() } : {}),
    })
    .where(and(eq(routers.tenantId, tenantId), eq(routers.id, id)));
}

export interface RouterMapRow extends Router {
  pelangganCount: number;
}

export async function listRoutersForMap(tenantId: string): Promise<RouterMapRow[]> {
  const rows = await listRouters(tenantId);
  const result: RouterMapRow[] = [];
  for (const row of rows) {
    const pelangganCount = await db.$count(
      pelanggan,
      and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.routerId, row.id))
    );
    result.push({ ...row, pelangganCount });
  }
  return result;
}

export async function updateRouterLocation(
  tenantId: string,
  id: string,
  latitude: number | null,
  longitude: number | null
) {
  const existing = await getRouterForTenant(tenantId, id);
  if (!existing) throw new Error("Router tidak ditemukan.");

  const hasLat = latitude != null && Number.isFinite(latitude);
  const hasLng = longitude != null && Number.isFinite(longitude);
  if (hasLat !== hasLng) {
    throw new Error("Latitude dan longitude harus diisi keduanya, atau kosongkan keduanya.");
  }

  await db
    .update(routers)
    .set({
      latitude: hasLat ? latitude : null,
      longitude: hasLng ? longitude : null,
    })
    .where(and(eq(routers.tenantId, tenantId), eq(routers.id, id)));
}

export async function clearRouterLocation(tenantId: string, id: string) {
  await updateRouterLocation(tenantId, id, null, null);
}

export async function deleteRouter(tenantId: string, id: string) {
  const usedByCustomers = await db.$count(
    pelanggan,
    and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.routerId, id))
  );
  if (usedByCustomers > 0) {
    throw new Error(
      `Router masih dipakai oleh ${usedByCustomers} pelanggan. Pindahkan/hapus pelanggan terkait terlebih dahulu.`
    );
  }
  const usedByPaket = await db.$count(
    paketInternet,
    and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.routerId, id))
  );
  if (usedByPaket > 0) {
    throw new Error(
      `Router masih dipakai oleh ${usedByPaket} paket internet. Ubah/hapus paket terkait terlebih dahulu.`
    );
  }
  const usedByOdp = await db.$count(
    odp,
    and(eq(odp.tenantId, tenantId), eq(odp.inputRouterId, id))
  );
  if (usedByOdp > 0) {
    throw new Error(
      `Router masih jadi sumber input ${usedByOdp} ODP. Ubah sumber input ODP di Peta terlebih dahulu.`
    );
  }
  try {
    await db.delete(routers).where(and(eq(routers.tenantId, tenantId), eq(routers.id, id)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/foreign\s*key/i.test(msg)) {
      throw new Error(
        "Router masih dipakai data lain. Periksa pelanggan, paket internet, atau ODP terkait."
      );
    }
    throw err;
  }
}

/** Cek status router via Mikrotik lalu simpan ke DB. */
export async function refreshRouterStatus(
  tenantId: string,
  id: string
): Promise<{ online?: boolean; message?: string; error?: string }> {
  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, id)),
  });
  if (!router) return { error: "Router tidak ditemukan." };

  const snapshot = await getRouterStatusSnapshot(tenantId, id);
  if (!snapshot) return { error: "Router tidak ditemukan." };

  if (snapshot.online) {
    const parts = [`Router "${router.nama}" terhubung`];
    if (snapshot.uptime) parts.push(`uptime ${snapshot.uptime}`);
    if (typeof snapshot.activeSessions === "number") {
      parts.push(`${snapshot.activeSessions} sesi PPPoE aktif`);
    }
    return { online: true, message: parts.join(" · ") };
  }

  const detail =
    snapshot.error?.trim() || "Periksa IP, port, username, password, dan koneksi VPN/LAN.";
  return {
    online: false,
    error: `Tidak dapat terhubung ke Mikrotik (${router.ipAddress}): ${detail}`,
  };
}

export async function getRouterStatusSnapshot(tenantId: string, id: string) {
  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, id)),
  });
  if (!router) return null;

  const status = await getMikrotikClient().getStatus({
    connectionMode: router.connectionMode,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    username: router.username,
    password: router.passwordEncrypted,
  });

  await db.update(routers).set({ isOnline: status.online }).where(eq(routers.id, id));

  return {
    online: status.online,
    lastCheck: new Date().toISOString(),
    activeSessions: typeof status.activeUsers === "number" ? status.activeUsers : null,
    uptime: status.uptime ?? null,
    error: status.error,
  };
}
