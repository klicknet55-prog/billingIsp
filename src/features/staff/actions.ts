"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { parseForm } from "@/lib/validation";
import {
  createStaff,
  deleteStaff,
  setStaffActive,
  updateStaff,
  type StaffRole,
} from "./service";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const staffSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
  role: z.enum(["admin", "kolektor", "teknisi"]),
  phone: z.string().optional(),
  password: z.string().optional(),
});

export async function saveStaffAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const owner = await requireUser(["owner"]);
  const parsed = parseForm(staffSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const id = String(formData.get("id") ?? "");
  const input = {
    nama: parsed.data.nama,
    email: parsed.data.email,
    role: parsed.data.role as StaffRole,
    phone: parsed.data.phone ?? null,
    password: parsed.data.password,
  };
  const result = id
    ? await updateStaff(owner.tenantId!, id, input)
    : await createStaff(owner.tenantId!, input);
  if ("error" in result) return { error: result.error };
  revalidatePath("/dashboard/staf");
  return { ok: true };
}

export async function setStaffActiveAction(formData: FormData) {
  const owner = await requireUser(["owner"]);
  await setStaffActive(
    owner.tenantId!,
    String(formData.get("id") ?? ""),
    String(formData.get("isActive") ?? "") === "true"
  );
  revalidatePath("/dashboard/staf");
}

export async function deleteStaffAction(formData: FormData) {
  const owner = await requireUser(["owner"]);
  await deleteStaff(owner.tenantId!, String(formData.get("id") ?? ""));
  revalidatePath("/dashboard/staf");
}

/** Reset kata sandi staf ke nilai baru (owner only). */
export async function resetStaffPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const owner = await requireUser(["owner"]);
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { fieldErrors: { password: "Kata sandi minimal 6 karakter" } };
  }
  const staff = await db.query.users.findFirst({
    where: and(eq(users.tenantId, owner.tenantId!), eq(users.id, id)),
  });
  if (!staff || staff.role === "owner") {
    return { error: "Staf tidak ditemukan." };
  }
  await db
    .update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(users.id, id));
  revalidatePath("/dashboard/staf");
  return { ok: true };
}
