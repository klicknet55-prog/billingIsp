import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paketInternet, packageTenants, pelanggan, routers, subscriptions, type Router } from "@/lib/db/schema";
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
  tipe: "pppoe" | "hotspot";
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

  await db.insert(routers).values({
    id: newId("rtr"),
    tenantId,
    nama: input.nama,
    connectionMode: input.connectionMode,
    ipAddress: input.ipAddress,
    apiPort: input.apiPort,
    username: input.username,
    // Catatan: di produksi enkripsi password sebelum disimpan.
    passwordEncrypted: input.password,
    tipe: input.tipe,
  });
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
      tipe: input.tipe,
      ...(input.password?.trim() ? { passwordEncrypted: input.password.trim() } : {}),
    })
    .where(and(eq(routers.tenantId, tenantId), eq(routers.id, id)));
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
  await db.delete(routers).where(and(eq(routers.tenantId, tenantId), eq(routers.id, id)));
}

/** Cek status router via Mikrotik lalu simpan ke DB. */
export async function refreshRouterStatus(
  tenantId: string,
  id: string
): Promise<{ error?: string }> {
  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, id)),
  });
  if (!router) return { error: "Router tidak ditemukan." };

  const status = await getMikrotikClient().getStatus({
    connectionMode: router.connectionMode,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    username: router.username,
    password: router.passwordEncrypted,
  });

  await db.update(routers).set({ isOnline: status.online }).where(eq(routers.id, id));

  if (!status.online && status.error) return { error: status.error };
  return {};
}
