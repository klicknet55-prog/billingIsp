import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { odp, pelanggan, routers, type Odp } from "@/lib/db/schema";
import { newId } from "@/lib/utils";
import { kapasitasFromSplitterPasif, normalizeOdpPort, odpPortLabels } from "./utils";
import type { OdpFormOption } from "./types";

export type { OdpFormOption } from "./types";

export interface OdpRow extends Odp {
  portTerpakai: number;
  childOdpCount: number;
  inputFromLabel: string | null;
}

export interface OdpInput {
  kode: string;
  nama?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  splitterRasio?: string | null;
  redamanInputDb?: number | null;
  redamanOutputDb?: number | null;
  splitterPasif?: string | null;
  kapasitasPort?: number;
  inputRouterId?: string | null;
  inputOdpId?: string | null;
  catatan?: string | null;
  isActive?: boolean;
}

async function countPortTerpakai(tenantId: string, odpId: string, excludePelangganId?: string) {
  const rows = await db.query.pelanggan.findMany({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.odpId, odpId)),
    columns: { id: true },
  });
  return excludePelangganId ? rows.filter((r) => r.id !== excludePelangganId).length : rows.length;
}

async function countChildOdp(tenantId: string, odpId: string) {
  return db.$count(odp, and(eq(odp.tenantId, tenantId), eq(odp.inputOdpId, odpId)));
}

function inputFromLabel(
  row: Odp,
  routerNames: Map<string, string>,
  odpCodes: Map<string, string>
): string | null {
  if (row.inputRouterId) {
    const nama = routerNames.get(row.inputRouterId);
    return nama ? `Router: ${nama}` : "Router";
  }
  if (row.inputOdpId) {
    const kode = odpCodes.get(row.inputOdpId);
    return kode ? `ODP: ${kode}` : "ODP induk";
  }
  return null;
}

export async function listOdp(tenantId: string): Promise<OdpRow[]> {
  const [rows, routerList, allOdps] = await Promise.all([
    db.query.odp.findMany({
      where: eq(odp.tenantId, tenantId),
      orderBy: [asc(odp.kode)],
    }),
    db.query.routers.findMany({
      where: eq(routers.tenantId, tenantId),
      columns: { id: true, nama: true },
    }),
    db.query.odp.findMany({
      where: eq(odp.tenantId, tenantId),
      columns: { id: true, kode: true },
    }),
  ]);

  const routerNames = new Map(routerList.map((r) => [r.id, r.nama]));
  const odpCodes = new Map(allOdps.map((o) => [o.id, o.kode]));

  const result: OdpRow[] = [];
  for (const row of rows) {
    result.push({
      ...row,
      portTerpakai: await countPortTerpakai(tenantId, row.id),
      childOdpCount: await countChildOdp(tenantId, row.id),
      inputFromLabel: inputFromLabel(row, routerNames, odpCodes),
    });
  }
  return result;
}

export async function listOdpOptions(tenantId: string, excludeId?: string) {
  const rows = await db.query.odp.findMany({
    where: eq(odp.tenantId, tenantId),
    columns: { id: true, kode: true, nama: true, kapasitasPort: true, isActive: true },
    orderBy: [asc(odp.kode)],
  });
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
}

/** ODP + daftar port yang sudah dipakai (untuk form pelanggan). */
export async function listOdpFormOptions(
  tenantId: string,
  excludePelangganId?: string
): Promise<OdpFormOption[]> {
  const [odpRows, pelangganRows] = await Promise.all([
    db.query.odp.findMany({
      where: eq(odp.tenantId, tenantId),
      columns: { id: true, kode: true, nama: true, kapasitasPort: true, isActive: true },
      orderBy: [asc(odp.kode)],
    }),
    db.query.pelanggan.findMany({
      where: eq(pelanggan.tenantId, tenantId),
      columns: { id: true, odpId: true, odpPort: true },
    }),
  ]);

  const usedByOdp = new Map<string, string[]>();
  for (const row of pelangganRows) {
    if (!row.odpId || !row.odpPort?.trim()) continue;
    if (excludePelangganId && row.id === excludePelangganId) continue;
    const ports = usedByOdp.get(row.odpId) ?? [];
    ports.push(normalizeOdpPort(row.odpPort));
    usedByOdp.set(row.odpId, ports);
  }

  return odpRows.map((row) => ({
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    kapasitasPort: row.kapasitasPort,
    usedPorts: usedByOdp.get(row.id) ?? [],
  }));
}

export async function getOdp(tenantId: string, id: string) {
  const row = await db.query.odp.findFirst({
    where: and(eq(odp.tenantId, tenantId), eq(odp.id, id)),
  });
  if (!row) return null;

  const [routerList, allOdps] = await Promise.all([
    db.query.routers.findMany({
      where: eq(routers.tenantId, tenantId),
      columns: { id: true, nama: true },
    }),
    db.query.odp.findMany({
      where: eq(odp.tenantId, tenantId),
      columns: { id: true, kode: true },
    }),
  ]);

  return {
    ...row,
    portTerpakai: await countPortTerpakai(tenantId, id),
    childOdpCount: await countChildOdp(tenantId, id),
    inputFromLabel: inputFromLabel(
      row,
      new Map(routerList.map((r) => [r.id, r.nama])),
      new Map(allOdps.map((o) => [o.id, o.kode]))
    ),
  };
}

function resolveKapasitas(input: OdpInput): number {
  if (input.kapasitasPort && input.kapasitasPort > 0) return input.kapasitasPort;
  const fromSplitter = kapasitasFromSplitterPasif(input.splitterPasif);
  return fromSplitter ?? 8;
}

async function assertKodeUnique(tenantId: string, kode: string, excludeId?: string) {
  const existing = await db.query.odp.findFirst({
    where: excludeId
      ? and(eq(odp.tenantId, tenantId), eq(odp.kode, kode), ne(odp.id, excludeId))
      : and(eq(odp.tenantId, tenantId), eq(odp.kode, kode)),
  });
  if (existing) throw new Error(`ID ODP "${kode}" sudah dipakai.`);
}

async function assertNoCircularUpstream(
  tenantId: string,
  parentOdpId: string,
  childOdpId: string
) {
  let current: string | null = parentOdpId;
  const visited = new Set<string>();

  while (current) {
    if (current === childOdpId) {
      throw new Error("ODP induk membentuk loop. Pilih sumber input yang lain.");
    }
    if (visited.has(current)) break;
    visited.add(current);

    const row: { inputOdpId: string | null } | undefined = await db.query.odp.findFirst({
      where: and(eq(odp.tenantId, tenantId), eq(odp.id, current)),
      columns: { inputOdpId: true },
    });
    current = row?.inputOdpId ?? null;
  }
}

async function resolveUpstream(
  tenantId: string,
  input: OdpInput,
  excludeOdpId?: string
): Promise<{ inputRouterId: string | null; inputOdpId: string | null }> {
  const routerId = input.inputRouterId?.trim() || null;
  const parentOdpId = input.inputOdpId?.trim() || null;

  if (routerId && parentOdpId) {
    throw new Error("Pilih salah satu sumber input: router/server atau ODP induk.");
  }

  if (routerId) {
    const router = await db.query.routers.findFirst({
      where: and(eq(routers.tenantId, tenantId), eq(routers.id, routerId)),
    });
    if (!router) throw new Error("Router sumber tidak ditemukan.");
    return { inputRouterId: routerId, inputOdpId: null };
  }

  if (parentOdpId) {
    if (excludeOdpId && parentOdpId === excludeOdpId) {
      throw new Error("ODP tidak boleh mengambil input dari dirinya sendiri.");
    }
    const parent = await db.query.odp.findFirst({
      where: and(eq(odp.tenantId, tenantId), eq(odp.id, parentOdpId)),
    });
    if (!parent) throw new Error("ODP induk tidak ditemukan.");
    if (excludeOdpId) {
      await assertNoCircularUpstream(tenantId, parentOdpId, excludeOdpId);
    }
    return { inputRouterId: null, inputOdpId: parentOdpId };
  }

  return { inputRouterId: null, inputOdpId: null };
}

export async function createOdp(tenantId: string, input: OdpInput) {
  const kode = input.kode.trim();
  if (!kode) throw new Error("ID ODP wajib diisi.");
  await assertKodeUnique(tenantId, kode);
  const upstream = await resolveUpstream(tenantId, input);

  const id = newId("odp");
  await db.insert(odp).values({
    id,
    tenantId,
    kode,
    nama: input.nama?.trim() || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    splitterRasio: input.splitterRasio?.trim() || null,
    redamanInputDb: input.redamanInputDb ?? null,
    redamanOutputDb: input.redamanOutputDb ?? null,
    splitterPasif: input.splitterPasif?.trim() || null,
    kapasitasPort: resolveKapasitas(input),
    inputRouterId: upstream.inputRouterId,
    inputOdpId: upstream.inputOdpId,
    catatan: input.catatan?.trim() || null,
    isActive: input.isActive ?? true,
  });
  return id;
}

export async function updateOdp(tenantId: string, id: string, input: OdpInput) {
  const current = await getOdp(tenantId, id);
  if (!current) throw new Error("ODP tidak ditemukan.");

  const kode = input.kode.trim();
  if (!kode) throw new Error("ID ODP wajib diisi.");
  await assertKodeUnique(tenantId, kode, id);

  const kapasitasPort = resolveKapasitas(input);
  if (current.portTerpakai > kapasitasPort) {
    throw new Error(
      `Kapasitas port (${kapasitasPort}) lebih kecil dari pelanggan terhubung (${current.portTerpakai}).`
    );
  }

  const upstream = await resolveUpstream(tenantId, input, id);

  await db
    .update(odp)
    .set({
      kode,
      nama: input.nama?.trim() || null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      splitterRasio: input.splitterRasio?.trim() || null,
      redamanInputDb: input.redamanInputDb ?? null,
      redamanOutputDb: input.redamanOutputDb ?? null,
      splitterPasif: input.splitterPasif?.trim() || null,
      kapasitasPort,
      inputRouterId: upstream.inputRouterId,
      inputOdpId: upstream.inputOdpId,
      catatan: input.catatan?.trim() || null,
      isActive: input.isActive ?? true,
    })
    .where(and(eq(odp.tenantId, tenantId), eq(odp.id, id)));
}

export async function deleteOdp(tenantId: string, id: string) {
  const used = await countPortTerpakai(tenantId, id);
  if (used > 0) {
    throw new Error(`ODP masih dipakai ${used} pelanggan. Pindahkan pelanggan terlebih dahulu.`);
  }
  const childCount = await countChildOdp(tenantId, id);
  if (childCount > 0) {
    throw new Error(`ODP masih jadi sumber input ${childCount} ODP lain. Ubah sumber input ODP cabang terlebih dahulu.`);
  }
  await db.delete(odp).where(and(eq(odp.tenantId, tenantId), eq(odp.id, id)));
}

/** Validasi assign pelanggan ke ODP (kapasitas port). */
export async function assertPelangganOdpCapacity(
  tenantId: string,
  odpId: string | null | undefined,
  excludePelangganId?: string
) {
  if (!odpId) return;
  const row = await getOdp(tenantId, odpId);
  if (!row) throw new Error("ODP tidak ditemukan.");
  if (!row.isActive) throw new Error("ODP tidak aktif.");
  const used = await countPortTerpakai(tenantId, odpId, excludePelangganId);
  if (used >= row.kapasitasPort) {
    throw new Error(`Kapasitas ODP ${row.kode} penuh (${used}/${row.kapasitasPort}).`);
  }
}

/** Validasi nomor port ODP unik dan masih tersedia. */
export async function assertPelangganOdpPort(
  tenantId: string,
  odpId: string | null | undefined,
  odpPort: string | null | undefined,
  excludePelangganId?: string
) {
  if (!odpId) return;

  const row = await db.query.odp.findFirst({
    where: and(eq(odp.tenantId, tenantId), eq(odp.id, odpId)),
  });
  if (!row) throw new Error("ODP tidak ditemukan.");

  const port = odpPort?.trim();
  if (!port) {
    throw new Error("Pilih port ODP.");
  }

  const normalized = normalizeOdpPort(port);
  const validLabels = odpPortLabels(row.kapasitasPort);
  if (!validLabels.includes(normalized)) {
    throw new Error(`Port ${normalized} tidak valid untuk ODP ${row.kode}.`);
  }

  const assigned = await db.query.pelanggan.findMany({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.odpId, odpId)),
    columns: { id: true, odpPort: true },
  });

  for (const p of assigned) {
    if (excludePelangganId && p.id === excludePelangganId) continue;
    if (p.odpPort && normalizeOdpPort(p.odpPort) === normalized) {
      throw new Error(`Port ${normalized} sudah dipakai di ODP ${row.kode}.`);
    }
  }
}

export async function pelangganNamesByOdp(tenantId: string, odpId: string) {
  return db.query.pelanggan.findMany({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.odpId, odpId)),
    columns: { id: true, nama: true, odpPort: true },
    orderBy: [asc(pelanggan.nama)],
  });
}
