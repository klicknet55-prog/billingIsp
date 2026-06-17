import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { routers, type Router } from "@/lib/db/schema";
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
  ipAddress: string;
  apiPort: string;
  username: string;
  password: string;
  tipe: "pppoe" | "hotspot";
}

export async function createRouter(tenantId: string, input: RouterInput) {
  await db.insert(routers).values({
    id: newId("rtr"),
    tenantId,
    nama: input.nama,
    ipAddress: input.ipAddress,
    apiPort: input.apiPort,
    username: input.username,
    // Catatan: di produksi enkripsi password sebelum disimpan.
    passwordEncrypted: input.password,
    tipe: input.tipe,
  });
}

export async function deleteRouter(tenantId: string, id: string) {
  await db.delete(routers).where(and(eq(routers.tenantId, tenantId), eq(routers.id, id)));
}

/** Cek status router via Mikrotik (mock) lalu simpan ke DB. */
export async function refreshRouterStatus(tenantId: string, id: string) {
  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, id)),
  });
  if (!router) return;
  const status = await getMikrotikClient().getStatus({
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    username: router.username,
    password: router.passwordEncrypted,
  });
  await db.update(routers).set({ isOnline: status.online }).where(eq(routers.id, id));
}
