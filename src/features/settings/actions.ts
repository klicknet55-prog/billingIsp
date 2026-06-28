"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
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
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      return { error: "Format logo tidak didukung. Gunakan PNG/JPG/WEBP/SVG." };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { error: "Ukuran logo maksimal 2MB." };
    }
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1] || "png";
    const filename = `${user.tenantId}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "tenant-logos");
    await mkdir(uploadDir, { recursive: true });
    const output = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(output, Buffer.from(bytes));
    logoUrl = `/uploads/tenant-logos/${filename}`;
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

