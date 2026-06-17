import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { packageTenants, pelanggan, routers, subscriptions, type Router } from "@/lib/db/schema";
import { getMikrotikClient } from "@/lib/integrations/mikrotik";
import { newId } from "@/lib/utils";

export async function listRouters(tenantId: string): Promise<Router[]> {
  return db.query.routers.findMany({
    where: eq(routers.tenantId, tenantId),
    orderBy: [desc(routers.createdAt)],
  });
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
  await db.delete(routers).where(and(eq(routers.tenantId, tenantId), eq(routers.id, id)));
}

/** Cek status router via Mikrotik (mock) lalu simpan ke DB. */
export async function refreshRouterStatus(tenantId: string, id: string) {
  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, id)),
  });
  if (!router) return;
  const status = await getMikrotikClient().getStatus({
    connectionMode: router.connectionMode,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    username: router.username,
    password: router.passwordEncrypted,
  });
  await db.update(routers).set({ isOnline: status.online }).where(eq(routers.id, id));
}
