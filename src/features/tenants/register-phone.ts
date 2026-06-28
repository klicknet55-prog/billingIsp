import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/auth/otp";

/** No. WA owner tenant sudah dipakai tenant lain. */
export async function isTenantRegisterPhoneTaken(rawPhone: string): Promise<boolean> {
  const phone = normalizePhone(rawPhone.trim());
  if (!phone) return false;

  const existing = await db.query.users.findFirst({
    where: and(eq(users.phone, phone), isNotNull(users.tenantId), eq(users.role, "owner")),
  });
  return !!existing;
}

export async function assertTenantRegisterPhoneAvailable(
  rawPhone: string
): Promise<string | null> {
  const phone = normalizePhone(rawPhone.trim());
  if (phone.length < 10) return "No. WhatsApp admin wajib diisi (min. 10 digit).";
  if (await isTenantRegisterPhoneTaken(phone)) {
    return "No. WhatsApp sudah terdaftar untuk tenant lain.";
  }
  return null;
}
