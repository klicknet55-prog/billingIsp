import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  packageTenants,
  paketInternet,
  pelanggan,
  routers,
  subscriptions,
  type Pelanggan,
} from "@/lib/db/schema";
import { getMikrotikClient } from "@/lib/integrations/mikrotik";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("customers");

export interface PelangganRow extends Pelanggan {
  paketNama: string | null;
  routerNama: string | null;
}

export async function listPelanggan(tenantId: string): Promise<PelangganRow[]> {
  const rows = await db
    .select({
      p: pelanggan,
      paketNama: paketInternet.nama,
      routerNama: routers.nama,
    })
    .from(pelanggan)
    .leftJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
    .leftJoin(routers, eq(pelanggan.routerId, routers.id))
    .where(eq(pelanggan.tenantId, tenantId))
    .orderBy(desc(pelanggan.createdAt));
  return rows.map((r) => ({ ...r.p, paketNama: r.paketNama, routerNama: r.routerNama }));
}

export async function getPelanggan(tenantId: string, id: string) {
  return db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)),
  });
}

export interface PelangganInput {
  nama: string;
  noWa: string;
  alamat?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ipAddress?: string | null;
  paketInternetId?: string | null;
  routerId?: string | null;
  tglJatuhTempo?: Date | null;
}

export async function createPelanggan(
  tenantId: string,
  input: PelangganInput,
  createdBy: string
) {
  // Enforce limit pelanggan sesuai paket SaaS tenant.
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.status, "active")),
    orderBy: [desc(subscriptions.mulai)],
  });
  if (sub) {
    const pkg = await db.query.packageTenants.findFirst({
      where: eq(packageTenants.id, sub.packageTenantId),
    });
    const maxPelanggan = pkg?.limitasi?.maxPelanggan;
    if (typeof maxPelanggan === "number" && maxPelanggan > 0) {
      const totalPelanggan = await db.$count(pelanggan, eq(pelanggan.tenantId, tenantId));
      if (totalPelanggan >= maxPelanggan) {
        throw new Error(
          `Limit pelanggan paket SaaS tercapai (${totalPelanggan}/${maxPelanggan}). Upgrade paket untuk menambah pelanggan baru.`
        );
      }
    }
  }

  const id = newId("pel");
  await db.insert(pelanggan).values({
    id,
    tenantId,
    nama: input.nama,
    noWa: input.noWa,
    alamat: input.alamat ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    ipAddress: input.ipAddress ?? null,
    paketInternetId: input.paketInternetId || null,
    routerId: input.routerId || null,
    tglJatuhTempo: input.tglJatuhTempo ?? null,
    createdBy,
  });
  log.info(`Pelanggan dibuat ${id}`);
  return id;
}

export async function updatePelanggan(tenantId: string, id: string, input: PelangganInput) {
  await db
    .update(pelanggan)
    .set({
      nama: input.nama,
      noWa: input.noWa,
      alamat: input.alamat ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      ipAddress: input.ipAddress ?? null,
      paketInternetId: input.paketInternetId || null,
      routerId: input.routerId || null,
      tglJatuhTempo: input.tglJatuhTempo ?? null,
    })
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)));
}

export async function deletePelanggan(tenantId: string, id: string) {
  await db
    .delete(pelanggan)
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)));
}

/** Set isolasi pelanggan + sinkron ke Mikrotik (mock). */
export async function setIsolasi(tenantId: string, id: string, isolated: boolean) {
  const cust = await getPelanggan(tenantId, id);
  if (!cust) return;
  if (cust.routerId) {
    const router = await db.query.routers.findFirst({ where: eq(routers.id, cust.routerId) });
    if (router) {
      const mk = getMikrotikClient();
      const creds = {
        ipAddress: router.ipAddress,
        apiPort: router.apiPort,
        username: router.username,
        password: router.passwordEncrypted,
      };
      if (isolated) await mk.isolate(creds, cust.ipAddress ?? cust.nama);
      else await mk.activate(creds, cust.ipAddress ?? cust.nama);
    }
  }
  await db
    .update(pelanggan)
    .set({ isIsolated: isolated })
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)));
}
