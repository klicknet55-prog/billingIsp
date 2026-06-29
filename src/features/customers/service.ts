import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  packageTenants,
  paketInternet,
  paymentAttempts,
  paymentGatewayLogs,
  pelanggan,
  portalAccessCodes,
  receiptTagihanLinks,
  routers,
  sessions,
  subscriptions,
  tagihan,
  tenants,
  ticketAssignments,
  tickets,
  type Pelanggan,
} from "@/lib/db/schema";
import { getMikrotikClient } from "@/lib/integrations/mikrotik";
import { clearModemStatusCache } from "@/features/maps/modem-cache";
import { isMikrotikEmptyReplyError, isMikrotikTimeoutError } from "@/lib/integrations/mikrotik/errors";
import { createLogger } from "@/lib/logger";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { newId } from "@/lib/utils";
import { computeInitialDueDate } from "@/features/jobs/due-date";
import { routerToCredentials } from "@/features/routers/service";
import { assertPelangganOdpCapacity } from "@/features/odp/service";

const log = createLogger("customers");

export type CreatePelangganResult = {
  id: string;
  mikrotikWarning?: string;
};

function isMikrotikConnectionError(err: unknown): boolean {
  if (isMikrotikTimeoutError(err)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Tidak dapat terhubung ke Mikrotik");
}

async function verifyCustomerOnMikrotik(
  tenantId: string,
  input: PelangganInput
): Promise<boolean> {
  if (!input.routerId || !input.connectionUsername?.trim()) return false;
  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, input.routerId)),
  });
  if (!router) return false;

  const mk = getMikrotikClient();
  const connectionType = input.connectionType === "hotspot" ? "hotspot" : "pppoe";
  return mk.connectionUserExists(routerToCredentials(router), {
    connectionType,
    username: input.connectionUsername.trim(),
  });
}

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
  odpId?: string | null;
  odpPort?: string | null;
  tglDaftar?: Date | null;
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

/** Tipe koneksi pelanggan mengikuti paket internet terpilih. */
async function alignConnectionTypeWithPaket(
  tenantId: string,
  input: PelangganInput
): Promise<PelangganInput> {
  if (!input.paketInternetId) return input;
  const paket = await db.query.paketInternet.findFirst({
    where: and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, input.paketInternetId)),
  });
  if (!paket) throw new Error("Paket internet tidak ditemukan.");
  return { ...input, connectionType: paket.tipe };
}

function mikrotikConnectionComment(brandName: string, customerName: string): string {
  return `${brandName}: ${customerName}`;
}

async function syncCustomerConnection(
  tenantId: string,
  input: PelangganInput,
  customerName: string
) {
  if (!input.routerId || !input.paketInternetId) return;
  const [router, paket, tenant] = await Promise.all([
    db.query.routers.findFirst({
      where: and(eq(routers.tenantId, tenantId), eq(routers.id, input.routerId!)),
    }),
    db.query.paketInternet.findFirst({
      where: and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, input.paketInternetId!)),
    }),
    db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) }),
  ]);

  if (!router) throw new Error("Router untuk sinkronisasi tidak ditemukan.");
  if (!paket) throw new Error("Paket internet untuk sinkronisasi tidak ditemukan.");

  const brandName = tenant?.namaUsaha?.trim() || DEFAULT_BRAND_NAME;
  const comment = mikrotikConnectionComment(brandName, customerName);

  const mk = getMikrotikClient();
  const creds = {
    connectionMode: router.connectionMode,
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    username: router.username,
    password: router.passwordEncrypted,
  } as const;

  if (paket.tipe === "pppoe") {
    const profile = paket.mikrotikProfilePppoe?.trim();
    if (!profile) {
      throw new Error("Profile PPPoE pada paket internet belum diisi.");
    }
    await mk.upsertPppoeSecret(creds, {
      username: input.connectionUsername!.trim(),
      password: input.connectionPassword!.trim(),
      profile,
      remoteAddress: input.ipAddress ?? undefined,
      comment,
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
    comment,
  });
}

export async function createPelanggan(
  tenantId: string,
  input: PelangganInput,
  createdBy: string
): Promise<CreatePelangganResult> {
  assertConnectionCredentials(input);
  const aligned = await alignConnectionTypeWithPaket(tenantId, input);
  await assertPaketMatchesRouter(tenantId, aligned);
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

  await assertPelangganOdpCapacity(tenantId, aligned.odpId);

  const tglDaftar = aligned.tglDaftar ?? new Date();
  const tglJatuhTempo = aligned.tglJatuhTempo ?? computeInitialDueDate(tglDaftar);

  const id = newId("pel");
  await db.insert(pelanggan).values({
    id,
    tenantId,
    nama: aligned.nama,
    noWa: aligned.noWa,
    connectionType: aligned.connectionType,
    connectionUsername: aligned.connectionUsername ?? null,
    connectionPassword: aligned.connectionPassword ?? null,
    alamat: aligned.alamat ?? null,
    latitude: aligned.latitude ?? null,
    longitude: aligned.longitude ?? null,
    ipAddress: aligned.ipAddress ?? null,
    paketInternetId: aligned.paketInternetId || null,
    routerId: aligned.routerId || null,
    odpId: aligned.odpId || null,
    odpPort: aligned.odpPort?.trim() || null,
    tglDaftar,
    tglJatuhTempo,
    createdBy,
  });

  try {
    await syncCustomerConnection(tenantId, aligned, aligned.nama);
  } catch (err) {
    if (isMikrotikConnectionError(err)) {
      const exists = await verifyCustomerOnMikrotik(tenantId, aligned);
      if (exists) {
        log.warn(`Pelanggan ${id}: Mikrotik error setelah sync, user sudah ada di router`);
        return {
          id,
          mikrotikWarning:
            "Pelanggan tersimpan. User sudah ada di Mikrotik (respon router lambat/timeout).",
        };
      }
    }
    await db
      .delete(pelanggan)
      .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)));
    throw err;
  }

  log.info(`Pelanggan dibuat ${id}`);
  return { id };
}

export async function updatePelanggan(tenantId: string, id: string, input: PelangganInput) {
  assertConnectionCredentials(input);
  const aligned = await alignConnectionTypeWithPaket(tenantId, input);
  await assertPaketMatchesRouter(tenantId, aligned);
  await assertPelangganOdpCapacity(tenantId, aligned.odpId, id);
  await syncCustomerConnection(tenantId, aligned, aligned.nama);
  const tglDaftar = aligned.tglDaftar ?? undefined;
  const tglJatuhTempo =
    aligned.tglJatuhTempo ??
    (tglDaftar ? computeInitialDueDate(tglDaftar) : undefined);
  await db
    .update(pelanggan)
    .set({
      nama: aligned.nama,
      noWa: aligned.noWa,
      connectionType: aligned.connectionType,
      connectionUsername: aligned.connectionUsername ?? null,
      connectionPassword: aligned.connectionPassword ?? null,
      alamat: aligned.alamat ?? null,
      latitude: aligned.latitude ?? null,
      longitude: aligned.longitude ?? null,
      ipAddress: aligned.ipAddress ?? null,
      paketInternetId: aligned.paketInternetId || null,
      routerId: aligned.routerId || null,
      odpId: aligned.odpId || null,
      odpPort: aligned.odpPort?.trim() || null,
      ...(tglDaftar ? { tglDaftar } : {}),
      ...(tglJatuhTempo ? { tglJatuhTempo } : {}),
    })
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, id)));
}

export interface DeletePelangganStats {
  invoiceCount: number;
  ticketCount: number;
  tagihanCount: number;
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
    if (isMikrotikEmptyReplyError(err)) {
      return { ok: true, skipped: true, message: "User tidak ada di Mikrotik — lanjut hapus data billing." };
    }
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

  const [customerInvoices, customerTagihan, customerTickets] = await Promise.all([
    db.query.invoices.findMany({
      where: and(eq(invoices.tenantId, tenantId), eq(invoices.pelangganId, id)),
      columns: { id: true },
    }),
    db.query.tagihan.findMany({
      where: and(eq(tagihan.tenantId, tenantId), eq(tagihan.pelangganId, id)),
      columns: { id: true },
    }),
    db.query.tickets.findMany({
      where: and(eq(tickets.tenantId, tenantId), eq(tickets.pelangganId, id)),
      columns: { id: true },
    }),
  ]);

  const invoiceIds = customerInvoices.map((row) => row.id);
  const tagihanIds = customerTagihan.map((row) => row.id);
  const ticketIds = customerTickets.map((row) => row.id);

  if (tagihanIds.length > 0) {
    await db
      .delete(receiptTagihanLinks)
      .where(inArray(receiptTagihanLinks.tagihanId, tagihanIds));
  }
  if (invoiceIds.length > 0) {
    await db
      .delete(receiptTagihanLinks)
      .where(inArray(receiptTagihanLinks.receiptId, invoiceIds));
  }

  await db
    .delete(paymentAttempts)
    .where(and(eq(paymentAttempts.tenantId, tenantId), eq(paymentAttempts.pelangganId, id)));

  if (invoiceIds.length > 0) {
    await db
      .delete(paymentGatewayLogs)
      .where(
        and(
          eq(paymentGatewayLogs.referenceType, "invoice"),
          inArray(paymentGatewayLogs.referenceId, invoiceIds)
        )
      );
  }

  if (tagihanIds.length > 0) {
    await db
      .delete(tagihan)
      .where(and(eq(tagihan.tenantId, tenantId), eq(tagihan.pelangganId, id)));
  }

  if (invoiceIds.length > 0) {
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
    .delete(portalAccessCodes)
    .where(and(eq(portalAccessCodes.tenantId, tenantId), eq(portalAccessCodes.pelangganId, id)));

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

  log.info(
    `Pelanggan dihapus ${id} (${invoiceIds.length} invoice, ${tagihanIds.length} tagihan, ${ticketIds.length} tiket)`
  );
  return {
    invoiceCount: invoiceIds.length,
    ticketCount: ticketIds.length,
    tagihanCount: tagihanIds.length,
  };
}

/** Set isolasi pelanggan: putus sesi aktif + disable user di Mikrotik. */
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

  void clearModemStatusCache(tenantId).catch(() => undefined);
}
