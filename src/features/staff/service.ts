import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("staff");

export type StaffRole = "admin" | "kolektor" | "teknisi";

/** Daftar staf tenant (kecuali owner yang sedang login tidak disembunyikan). */
export async function listStaff(tenantId: string): Promise<User[]> {
  return db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), ne(users.role, "superadmin")),
    orderBy: [desc(users.createdAt)],
  });
}

export async function getStaff(tenantId: string, id: string) {
  return db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.id, id)),
  });
}

export interface StaffInput {
  nama: string;
  email: string;
  role: StaffRole;
  phone?: string | null;
  password?: string;
}

export async function createStaff(
  tenantId: string,
  input: StaffInput
): Promise<{ ok: true } | { error: string }> {
  const email = input.email.toLowerCase().trim();
  const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (exists) return { error: "Email sudah terdaftar." };
  if (!input.password || input.password.length < 6)
    return { error: "Kata sandi minimal 6 karakter." };

  await db.insert(users).values({
    id: newId("usr"),
    tenantId,
    nama: input.nama.trim(),
    email,
    passwordHash: hashPassword(input.password),
    role: input.role,
    phone: input.phone || null,
  });
  log.info(`Staf dibuat: ${email} (${input.role})`);
  return { ok: true };
}

export async function updateStaff(
  tenantId: string,
  id: string,
  input: StaffInput
): Promise<{ ok: true } | { error: string }> {
  const staff = await getStaff(tenantId, id);
  if (!staff) return { error: "Staf tidak ditemukan." };
  if (staff.role === "owner") return { error: "Akun owner tidak dapat diubah perannya." };

  const patch: Partial<typeof users.$inferInsert> = {
    nama: input.nama.trim(),
    role: input.role,
    phone: input.phone || null,
  };
  if (input.password && input.password.length >= 6) {
    patch.passwordHash = hashPassword(input.password);
  }
  await db.update(users).set(patch).where(and(eq(users.tenantId, tenantId), eq(users.id, id)));
  return { ok: true };
}

export async function setStaffActive(tenantId: string, id: string, isActive: boolean) {
  const staff = await getStaff(tenantId, id);
  if (!staff || staff.role === "owner") return;
  await db
    .update(users)
    .set({ isActive })
    .where(and(eq(users.tenantId, tenantId), eq(users.id, id)));
}

export async function deleteStaff(tenantId: string, id: string) {
  const staff = await getStaff(tenantId, id);
  if (!staff || staff.role === "owner") return;
  await db.delete(users).where(and(eq(users.tenantId, tenantId), eq(users.id, id)));
}
