import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  packageTenants,
  paketInternet,
  pelanggan,
  routers,
  subscriptions,
  tickets,
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

export async function listPelanggan(tenantId: string, routerId?: string): Promise<PelangganRow[]> {
  const where = routerId
    ? and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.routerId, routerId))
    : eq(pelanggan.tenantId, tenantId);
  const rows = await db
    .select({
      p: pelanggan,
      paketNama: paketInternet.nama,
      routerNama: routers.nama,
    })
    .from(pelanggan)
    .leftJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
    .leftJoin(routers, eq(pelanggan.routerId, routers.id))
    .where(where)
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
  connectionType: "pppoe" | "hotspot";
  connectionUsername?: string | null;
  connectionPassword?: string | null;
  alamat?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ipAddress?: string | null;
  paketInternetId?: string | null;
  routerId?: string | null;
  tglJatuhTempo?: Date | null;
}

function assertConnectionCredentials(input: PelangganInput) {
  if (!input.connectionUsername?.trim() || !input.connectionPassword?.trim()) {
    throw new Error("Username dan password pelanggan wajib diisi.");
  }
}

async function syncCustomerConnection(
  tenantId: string,
  input: PelangganInput,
  customerName: string
) {
  if (!input.routerId || !input.paketInternetId) return;
  const [router, paket] = await Promise.all([
    db.query.routers.findFirst({
      where: and(eq(routers.tenantId, tenantId), eq(routers.id, input.routerId!)),
    }),
    db.query.paketInternet.findFirst({
      where: and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, input.paketInternetId!)),
    }),
  ]);

  if (!router) throw new Error("Router untuk sinkronisasi tidak ditemukan.");
  if (!paket) throw new Error("Paket internet untuk sinkronisasi tidak ditemukan.");

  const mk = getMikrotikClient();
  const creds = {
    connectionMode: router.connectionMode,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    username: router.username,
    password: router.passwordEncrypted,
  } as const;

  if (input.connectionType === "pppoe") {
    const profile = paket.mikrotikProfilePppoe?.trim();
    if (!profile) {
      throw new Error("Profile PPPoE pada paket internet belum diisi.");
    }
    await mk.upsertPppoeSecret(creds, {
      username: input.connectionUsername!.trim(),
      password: input.connectionPassword!.trim(),
      profile,
      remoteAddress: input.ipAddress ?? undefined,
      comment: `NetManage:${customerName}`,
    });
    return;
  }

  const profile = paket.mikrotikProfileHotspot?.trim();
  if (!profile) {
    throw new Error("Profile Hotspot pada paket internet belum diisi.");
  }
  await mk.upsertHotspotUser(creds, {
    username: input.connectionUsername!.trim(),
    password: input.connectionPassword!.trim(),
    profile,
    comment: `NetManage:${customerName}`,
  });
}

export async function createPelanggan(
  tenantId: string,
  input: PelangganInput,
  createdBy: string
) {
  assertConnectionCredentials(input);
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

  await syncCustomerConnection(tenantId, input, input.nama);

  const id = newId("pel");
  await db.insert(pelanggan).values({
    id,
    tenantId,
    nama: input.nama,
    noWa: input.noWa,
    connectionType: input.connectionType,
    connectionUsername: input.connectionUsername ?? null,
    connectionPassword: input.connectionPassword ?? null,
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
  assertConnectionCredentials(input);
  await syncCustomerConnection(tenantId, input, input.nama);
  await db
    .update(pelanggan)
    .set({
      nama: input.nama,
      noWa: input.noWa,
      connectionType: input.connectionType,
      connectionUsername: input.connectionUsername ?? null,
      connectionPassword: input.connectionPassword ?? null,
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
  const [invoiceCount, ticketCount] = await Promise.all([
    db.$count(
      invoices,
      and(eq(invoices.tenantId, tenantId), eq(invoices.pelangganId, id))
    ),
    db.$count(tickets, and(eq(tickets.tenantId, tenantId), eq(tickets.pelangganId, id))),
  ]);
  if (invoiceCount > 0 || ticketCount > 0) {
    throw new Error(
      `Pelanggan tidak dapat dihapus karena masih memiliki ${invoiceCount} invoice dan ${ticketCount} tiket.`
    );
  }
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
        connectionMode: router.connectionMode,
        ipAddress: router.ipAddress,
        apiPort: router.apiPort,
        username: router.username,
        password: router.passwordEncrypted,
      };
      const username = cust.connectionUsername?.trim() || cust.nama;
      const ref = { connectionType: cust.connectionType, username } as const;
      if (isolated) await mk.isolate(creds, ref);
      else await mk.activate(creds, ref);
    }
  }
  await db
    .update(pelanggan)
    .set({ isIsolated: isolated })
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)));
}
