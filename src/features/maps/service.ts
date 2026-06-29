import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { odp, pelanggan, routers } from "@/lib/db/schema";
import { getMikrotikClient } from "@/lib/integrations/mikrotik";
import type { ConnectionSnapshot, ModemMapStatus } from "@/lib/integrations/mikrotik/types";
import { routerToCredentials } from "@/features/routers/service";
import {
  cacheKey,
  clearModemStatusCache,
  getCachedSnapshots,
  setCachedSnapshots,
} from "./modem-cache";
import { resolveModemStatus } from "./modem-labels";

export interface MapPelangganMarker {
  id: string;
  nama: string;
  noWa: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  modemStatus: ModemMapStatus;
  odpId: string | null;
  odpKode: string | null;
  routerId: string | null;
}

export interface MapOdpMarker {
  id: string;
  kode: string;
  nama: string | null;
  latitude: number;
  longitude: number;
  splitterPasif: string | null;
  splitterRasio: string | null;
  redamanInputDb: number | null;
  redamanOutputDb: number | null;
  kapasitasPort: number;
  portTerpakai: number;
  inputRouterId: string | null;
  inputOdpId: string | null;
  inputRouterNama: string | null;
  inputOdpKode: string | null;
  pelanggan: { id: string; nama: string; odpPort: string | null }[];
}

export interface MapRouterMarker {
  id: string;
  nama: string;
  ipAddress: string;
  apiPort: string;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  pelangganCount: number;
}

export interface MapPageData {
  pelanggan: MapPelangganMarker[];
  odps: MapOdpMarker[];
  routers: MapRouterMarker[];
}

async function loadSnapshots(
  tenantId: string,
  routerId: string,
  type: "pppoe" | "hotspot",
  bustCache: boolean
): Promise<{ snapshots: ConnectionSnapshot[]; reachable: boolean }> {
  const key = cacheKey(tenantId, routerId, type);
  if (!bustCache) {
    const cached = await getCachedSnapshots(key);
    if (cached) return { snapshots: cached, reachable: true };
  }

  const router = await db.query.routers.findFirst({
    where: and(eq(routers.tenantId, tenantId), eq(routers.id, routerId)),
  });
  if (!router) return { snapshots: [], reachable: false };

  // Hindari timeout berulang jika router sudah diketahui offline (kecuali refresh manual).
  if (!bustCache && !router.isOnline) {
    return { snapshots: [], reachable: false };
  }

  try {
    const mk = getMikrotikClient();
    const status = await mk.getStatus(routerToCredentials(router), { quiet: true });
    if (!status.online) return { snapshots: [], reachable: false };

    const snapshots = await mk.snapshotConnections(routerToCredentials(router), type);
    await setCachedSnapshots(key, snapshots);
    return { snapshots, reachable: true };
  } catch {
    return { snapshots: [], reachable: false };
  }
}

export async function getMapPageData(
  tenantId: string,
  opts?: { bustCache?: boolean }
): Promise<MapPageData> {
  const bustCache = opts?.bustCache ?? false;
  const mockMode = process.env.MIKROTIK_DRIVER === "mock";

  const [pelangganRows, odpRows, routerRows] = await Promise.all([
    db
      .select({
        p: pelanggan,
        odpKode: odp.kode,
      })
      .from(pelanggan)
      .leftJoin(odp, eq(pelanggan.odpId, odp.id))
      .where(eq(pelanggan.tenantId, tenantId))
      .orderBy(asc(pelanggan.nama)),
    db.query.odp.findMany({
      where: and(eq(odp.tenantId, tenantId), eq(odp.isActive, true)),
      orderBy: [asc(odp.kode)],
    }),
    db.query.routers.findMany({
      where: eq(routers.tenantId, tenantId),
      orderBy: [asc(routers.nama)],
    }),
  ]);

  const routerGroups = new Map<
    string,
    { type: "pppoe" | "hotspot"; items: typeof pelangganRows }
  >();
  for (const row of pelangganRows) {
    if (!row.p.routerId) continue;
    const type = row.p.connectionType;
    const g = routerGroups.get(row.p.routerId) ?? { type, items: [] };
    g.items.push(row);
    routerGroups.set(row.p.routerId, g);
  }

  const snapshotMaps = new Map<string, Map<string, ConnectionSnapshot>>();
  const routerReachable = new Map<string, boolean>();

  for (const [routerId, group] of routerGroups) {
    const { snapshots, reachable } = await loadSnapshots(
      tenantId,
      routerId,
      group.type,
      bustCache
    );
    routerReachable.set(routerId, reachable);
    const byUser = new Map(snapshots.map((s) => [s.username, s]));
    snapshotMaps.set(routerId, byUser);
  }

  const pelangganMarkers: MapPelangganMarker[] = [];
  for (const row of pelangganRows) {
    if (row.p.latitude == null || row.p.longitude == null) continue;
    const routerId = row.p.routerId;
    const snapMap = routerId ? snapshotMaps.get(routerId) ?? new Map() : new Map();
    const reachable = routerId ? (routerReachable.get(routerId) ?? false) : false;

    pelangganMarkers.push({
      id: row.p.id,
      nama: row.p.nama,
      noWa: row.p.noWa,
      alamat: row.p.alamat,
      latitude: row.p.latitude,
      longitude: row.p.longitude,
      modemStatus: resolveModemStatus({
        connectionUsername: row.p.connectionUsername,
        isIsolated: row.p.isIsolated,
        snapshotByUser: snapMap,
        routerReachable: reachable,
        mockMode,
      }),
      odpId: row.p.odpId,
      odpKode: row.odpKode,
      routerId: row.p.routerId,
    });
  }

  const odps: MapOdpMarker[] = [];
  const odpCodeById = new Map(odpRows.map((o) => [o.id, o.kode]));
  const routerNameById = new Map(routerRows.map((r) => [r.id, r.nama]));

  for (const o of odpRows) {
    if (o.latitude == null || o.longitude == null) continue;
    const linked = pelangganRows
      .filter((r) => r.p.odpId === o.id)
      .map((r) => ({ id: r.p.id, nama: r.p.nama, odpPort: r.p.odpPort }));
    odps.push({
      id: o.id,
      kode: o.kode,
      nama: o.nama,
      latitude: o.latitude,
      longitude: o.longitude,
      splitterPasif: o.splitterPasif,
      splitterRasio: o.splitterRasio,
      redamanInputDb: o.redamanInputDb,
      redamanOutputDb: o.redamanOutputDb,
      kapasitasPort: o.kapasitasPort,
      portTerpakai: linked.length,
      inputRouterId: o.inputRouterId,
      inputOdpId: o.inputOdpId,
      inputRouterNama: o.inputRouterId ? routerNameById.get(o.inputRouterId) ?? null : null,
      inputOdpKode: o.inputOdpId ? odpCodeById.get(o.inputOdpId) ?? null : null,
      pelanggan: linked,
    });
  }

  const routerPelangganCount = new Map<string, number>();
  for (const row of pelangganRows) {
    if (!row.p.routerId) continue;
    routerPelangganCount.set(row.p.routerId, (routerPelangganCount.get(row.p.routerId) ?? 0) + 1);
  }

  const mapRouters: MapRouterMarker[] = [];
  for (const r of routerRows) {
    if (r.latitude == null || r.longitude == null) continue;
    mapRouters.push({
      id: r.id,
      nama: r.nama,
      ipAddress: r.ipAddress,
      apiPort: r.apiPort,
      isOnline: r.isOnline,
      latitude: r.latitude,
      longitude: r.longitude,
      pelangganCount: routerPelangganCount.get(r.id) ?? 0,
    });
  }

  return { pelanggan: pelangganMarkers, odps, routers: mapRouters };
}
