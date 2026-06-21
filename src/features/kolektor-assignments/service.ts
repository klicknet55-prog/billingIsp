import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { pelanggan, users } from "@/lib/db/schema";

export interface KolektorOption {
  id: string;
  nama: string;
  email: string;
}

export interface PelangganAssignmentRow {
  id: string;
  nama: string;
  noWa: string;
  alamat: string | null;
  kolektorId: string | null;
}

export async function listKolektors(tenantId: string): Promise<KolektorOption[]> {
  const rows = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, tenantId),
      eq(users.role, "kolektor"),
      eq(users.isActive, true)
    ),
    columns: { id: true, nama: true, email: true },
    orderBy: [asc(users.nama)],
  });
  return rows;
}

export async function listPelangganAssignments(tenantId: string): Promise<PelangganAssignmentRow[]> {
  const rows = await db.query.pelanggan.findMany({
    where: eq(pelanggan.tenantId, tenantId),
    columns: { id: true, nama: true, noWa: true, alamat: true, kolektorId: true },
    orderBy: [asc(pelanggan.nama)],
  });
  return rows;
}

export async function countPelangganByKolektor(tenantId: string, kolektorId: string): Promise<number> {
  return db.$count(
    pelanggan,
    and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.kolektorId, kolektorId))
  );
}

async function assertKolektorBelongsToTenant(tenantId: string, kolektorId: string) {
  const row = await db.query.users.findFirst({
    where: and(
      eq(users.tenantId, tenantId),
      eq(users.id, kolektorId),
      eq(users.role, "kolektor"),
      eq(users.isActive, true)
    ),
  });
  if (!row) throw new Error("Kolektor tidak valid atau tidak aktif.");
}

export async function savePelangganAssignments(
  tenantId: string,
  assignments: { pelangganId: string; kolektorId: string | null }[]
) {
  if (assignments.length === 0) return;

  const pelangganIds = assignments.map((a) => a.pelangganId);
  const validPelanggan = await db.query.pelanggan.findMany({
    where: and(eq(pelanggan.tenantId, tenantId), inArray(pelanggan.id, pelangganIds)),
    columns: { id: true },
  });
  const validIds = new Set(validPelanggan.map((p) => p.id));

  const kolektorIds = [
    ...new Set(assignments.map((a) => a.kolektorId).filter((id): id is string => !!id)),
  ];
  for (const kolektorId of kolektorIds) {
    await assertKolektorBelongsToTenant(tenantId, kolektorId);
  }

  for (const item of assignments) {
    if (!validIds.has(item.pelangganId)) {
      throw new Error(`Pelanggan ${item.pelangganId} tidak ditemukan.`);
    }
    await db
      .update(pelanggan)
      .set({ kolektorId: item.kolektorId })
      .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, item.pelangganId)));
  }
}

/** Lepas penugasan pelanggan saat akun kolektor dihapus. */
export async function clearKolektorAssignments(tenantId: string, kolektorId: string) {
  await db
    .update(pelanggan)
    .set({ kolektorId: null })
    .where(and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.kolektorId, kolektorId)));
}
