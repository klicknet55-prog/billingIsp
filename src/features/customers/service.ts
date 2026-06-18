import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  packageTenants,
  paketInternet,
  paymentGatewayLogs,
  pelanggan,
  routers,
  sessions,
  subscriptions,
  ticketAssignments,
  tickets,
  type Pelanggan,
} from "@/lib/db/schema";
import { getMikrotikClient } from "@/lib/integrations/mikrotik";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";
import { routerToCredentials } from "@/features/routers/service";

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

async function assertPaketMatchesRouter(tenantId: string, input: PelangganInput) {
  if (!input.paketInternetId || !input.routerId) return;
  const paket = await db.query.paketInternet.findFirst({
    where: and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, input.paketInternetId)),
  });
  if (!paket) throw new Error("Paket internet tidak ditemukan.");
  if (paket.routerId !== input.routerId) {
    throw new Error("Paket internet tidak sesuai dengan router yang dipilih.");
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
  await assertPaketMatchesRouter(tenantId, input);
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
  await assertPaketMatchesRouter(tenantId, input);
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

export interface DeletePelangganStats {
  invoiceCount: number;
  ticketCount: number;
}

export interface DeletePelangganStepResult {
  ok: boolean;
  message: string;
  skipped?: boolean;
  stats?: DeletePelangganStats;
}

export async function removePelangganFromMikrotik(
  tenantId: string,
  id: string
): Promise<DeletePelangganStepResult> {
  const cust = await getPelanggan(tenantId, id);
  if (!cust) {
    return { ok: false, message: "Pelanggan tidak ditemukan." };
  }
  if (!cust.routerId) {
    return { ok: true, skipped: true, message: "Tidak ada router — lewati hapus Mikrotik." };
  }

  const username = cust.connectionUsername?.trim();
  if (!username) {
    return { ok: true, skipped: true, message: "Username koneksi kosong — lewati hapus Mikrotik." };
  }

  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, cust.routerId)),
  });
  if (!router) {
    return { ok: true, skipped: true, message: "Router tidak ditemukan — lewati hapus Mikrotik." };
  }

  try {
    const result = await getMikrotikClient().removeConnectionUser(routerToCredentials(router), {
      connectionType: cust.connectionType,
      username,
    });
    if (!result.exists) {
      return {
        ok: true,
        skipped: true,
        message: `User '${username}' tidak ada di Mikrotik — lanjut hapus data billing.`,
      };
    }
    return { ok: true, message: `User '${username}' dihapus dari Mikrotik.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus user di Mikrotik.";
    return { ok: false, message: msg };
  }
}

export async function deletePelangganRecords(
  tenantId: string,
  id: string
): Promise<DeletePelangganStats> {
  const existing = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)),
  });
  if (!existing) throw new Error("Pelanggan tidak ditemukan.");

  const customerInvoices = await db.query.invoices.findMany({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.pelangganId, id)),
    columns: { id: true },
  });
  const invoiceIds = customerInvoices.map((row) => row.id);

  const customerTickets = await db.query.tickets.findMany({
    where: and(eq(tickets.tenantId, tenantId), eq(tickets.pelangganId, id)),
    columns: { id: true },
  });
  const ticketIds = customerTickets.map((row) => row.id);

  if (invoiceIds.length > 0) {
    await db
      .delete(paymentGatewayLogs)
      .where(
        and(
          eq(paymentGatewayLogs.referenceType, "invoice"),
          inArray(paymentGatewayLogs.referenceId, invoiceIds)
        )
      );
    await db
      .delete(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.pelangganId, id)));
  }

  if (ticketIds.length > 0) {
    await db.delete(ticketAssignments).where(inArray(ticketAssignments.ticketId, ticketIds));
    await db
      .delete(tickets)
      .where(and(eq(tickets.tenantId, tenantId), eq(tickets.pelangganId, id)));
  }

  await db
    .delete(sessions)
    .where(and(eq(sessions.subjectType, "pelanggan"), eq(sessions.subjectId, id)));

  await db.delete(pelanggan).where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)));

  const stillExists = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)),
    columns: { id: true },
  });
  if (stillExists) {
    throw new Error("Gagal menghapus data pelanggan dari database.");
  }

  log.info(`Pelanggan dihapus ${id} (${invoiceIds.length} invoice, ${ticketIds.length} tiket)`);
  return { invoiceCount: invoiceIds.length, ticketCount: ticketIds.length };
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
