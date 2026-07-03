"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import { saveLogoUpload } from "@/lib/uploads";
import { parseForm } from "@/lib/validation";

const adminProfileSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
  phone: z.string().trim().optional(),
  password: z.string().optional(),
});

const companyProfileSchema = z.object({
  namaUsaha: z.string().trim().min(1, "Nama usaha wajib diisi"),
});

export async function saveAdminProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  const parsed = parseForm(adminProfileSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const email = parsed.data.email.toLowerCase();
  const duplicate = await db.query.users.findFirst({
    where: and(eq(users.email, email), ne(users.id, user.id)),
  });
  if (duplicate) return { error: "Email sudah dipakai akun lain." };

  const patch: Partial<typeof users.$inferInsert> = {
    nama: parsed.data.nama,
    email,
    phone: parsed.data.phone || null,
  };
  if (parsed.data.password && parsed.data.password.trim().length > 0) {
    if (parsed.data.password.length < 6) {
      return { fieldErrors: { password: "Kata sandi minimal 6 karakter" } };
    }
    patch.passwordHash = hashPassword(parsed.data.password);
  }

  await db.update(users).set(patch).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pengaturan");
  return { ok: true };
}

const superadminProfileSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
  phone: z.string().trim().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
});

export async function saveSuperadminProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["superadmin"]);
  const parsed = parseForm(superadminProfileSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const email = parsed.data.email.toLowerCase();
  const duplicate = await db.query.users.findFirst({
    where: and(eq(users.email, email), ne(users.id, user.id)),
  });
  if (duplicate) return { error: "Email sudah dipakai akun lain." };

  const newPassword = parsed.data.newPassword?.trim() ?? "";
  const currentPassword = parsed.data.currentPassword?.trim() ?? "";
  const confirmPassword = parsed.data.confirmPassword?.trim() ?? "";

  if (newPassword.length > 0) {
    if (currentPassword.length === 0) {
      return { fieldErrors: { currentPassword: "Masukkan kata sandi saat ini" } };
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { fieldErrors: { currentPassword: "Kata sandi saat ini salah" } };
    }
    if (newPassword.length < 8) {
      return { fieldErrors: { newPassword: "Kata sandi baru minimal 8 karakter" } };
    }
    if (newPassword !== confirmPassword) {
      return { fieldErrors: { confirmPassword: "Konfirmasi kata sandi tidak cocok" } };
    }
  } else if (confirmPassword.length > 0 || currentPassword.length > 0) {
    return { fieldErrors: { newPassword: "Isi kata sandi baru jika ingin mengganti" } };
  }

  const patch: Partial<typeof users.$inferInsert> = {
    nama: parsed.data.nama,
    email,
    phone: parsed.data.phone || null,
  };
  if (newPassword.length > 0) {
    patch.passwordHash = hashPassword(newPassword);
  }

  await db.update(users).set(patch).where(eq(users.id, user.id));
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/pengaturan/akun");
  return { ok: true };
}

export async function saveCompanyProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["owner", "admin"]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };

  const parsed = companyProfileSchema.safeParse({
    namaUsaha: String(formData.get("namaUsaha") ?? ""),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { fieldErrors: { [issue?.path?.[0]?.toString() ?? "namaUsaha"]: issue?.message ?? "Data tidak valid" } };
  }

  let logoUrl: string | null | undefined = undefined;
  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    try {
      logoUrl = await saveLogoUpload("tenant-logos", file, user.tenantId);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Gagal mengunggah logo." };
    }
  }

  const removeLogo = String(formData.get("removeLogo") ?? "") === "on";

  await db
    .update(tenants)
    .set({
      namaUsaha: parsed.data.namaUsaha,
      ...(removeLogo ? { logoUrl: null } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    })
    .where(eq(tenants.id, user.tenantId));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pengaturan");
  return { ok: true };
}

