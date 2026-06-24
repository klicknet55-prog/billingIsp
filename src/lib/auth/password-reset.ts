import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { passwordResets, users } from "@/lib/db/schema";
import { getEmailClient } from "@/lib/integrations/email";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { newId } from "@/lib/utils";

const RESET_TTL_MS = 60 * 60 * 1000;
const STAFF_ROLES = ["owner", "admin", "kolektor", "teknisi"] as const;

export async function requestPasswordReset(emailRaw: string): Promise<{ ok: true } | { error: string }> {
  const email = emailRaw.toLowerCase().trim();
  if (!email) return { error: "Email wajib diisi." };

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user || user.role === "superadmin") {
    return { ok: true };
  }
  if (!STAFF_ROLES.includes(user.role as (typeof STAFF_ROLES)[number])) {
    return { ok: true };
  }

  const token = randomBytes(24).toString("hex");
  await db.insert(passwordResets).values({
    id: newId("prst"),
    email,
    token,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;
  const text = [
    `Halo ${user.nama},`,
    "",
    "Permintaan reset kata sandi akun NetManage Anda.",
    `Atur kata sandi baru (berlaku 1 jam): ${link}`,
    "",
    "Abaikan email ini jika Anda tidak meminta reset.",
  ].join("\n");

  await getEmailClient().send({ to: email, subject: "Reset kata sandi NetManage", text });

  if (user.phone?.trim()) {
    await getWhatsAppClient().sendNotification(
      user.phone.trim(),
      `Reset kata sandi NetManage: ${link}`,
      user.tenantId ?? undefined
    );
  }

  return { ok: true };
}

export async function completePasswordReset(
  token: string,
  password: string
): Promise<{ ok: true } | { error: string }> {
  if (password.length < 6) return { error: "Kata sandi minimal 6 karakter." };

  const row = await db.query.passwordResets.findFirst({
    where: and(eq(passwordResets.token, token), isNull(passwordResets.consumedAt)),
  });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { error: "Tautan reset tidak valid atau sudah kedaluwarsa." };
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, row.email) });
  if (!user) return { error: "Akun tidak ditemukan." };

  await db
    .update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(users.id, user.id));
  await db
    .update(passwordResets)
    .set({ consumedAt: new Date() })
    .where(eq(passwordResets.id, row.id));

  return { ok: true };
}
