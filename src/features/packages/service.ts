import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { paketInternet, type PaketInternet } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

export async function listPaket(tenantId: string): Promise<PaketInternet[]> {
  return db.query.paketInternet.findMany({
    where: eq(paketInternet.tenantId, tenantId),
    orderBy: [desc(paketInternet.hargaBulanan)],
  });
}

export interface PaketInput {
  nama: string;
  kecepatan: string;
  routerId?: string | null;
  mikrotikProfilePppoe?: string | null;
  mikrotikProfileHotspot?: string | null;
  hargaBulanan: number;
}

export async function createPaket(tenantId: string, input: PaketInput) {
  await db.insert(paketInternet).values({
    id: newId("pkt"),
    tenantId,
    routerId: input.routerId ?? null,
    nama: input.nama,
    kecepatan: input.kecepatan,
    mikrotikProfilePppoe: input.mikrotikProfilePppoe ?? null,
    mikrotikProfileHotspot: input.mikrotikProfileHotspot ?? null,
    hargaBulanan: input.hargaBulanan,
  });
}

export async function updatePaket(tenantId: string, id: string, input: PaketInput) {
  const existing = await db.query.paketInternet.findFirst({
    where: and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, id)),
  });
  if (!existing) throw new Error("Paket tidak ditemukan.");

  await db
    .update(paketInternet)
    .set({
      nama: input.nama,
      kecepatan: input.kecepatan,
      routerId: input.routerId ?? null,
      mikrotikProfilePppoe: input.mikrotikProfilePppoe ?? null,
      mikrotikProfileHotspot: input.mikrotikProfileHotspot ?? null,
      hargaBulanan: input.hargaBulanan,
    })
    .where(and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, id)));
}

export async function deletePaket(tenantId: string, id: string) {
  await db
    .delete(paketInternet)
    .where(and(eq(paketInternet.tenantId, tenantId), eq(paketInternet.id, id)));
}
