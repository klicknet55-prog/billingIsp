import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { otpCodes } from "@/lib/db/schema";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("auth:otp");
const OTP_TTL_MS = 5 * 60 * 1000;

/** Normalisasi nomor: hanya angka, awalan 0 -> 62. */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = `62${p.slice(1)}`;
  return p;
}

export async function requestOtp(rawPhone: string, tenantId?: string): Promise<void> {
  const phone = normalizePhone(rawPhone);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.insert(otpCodes).values({
    id: newId("otp"),
    phone,
    code,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  await getWhatsAppClient().sendOtp(phone, code, tenantId);
  log.info(`OTP dibuat untuk ${phone}`);
}

export async function verifyOtp(rawPhone: string, code: string): Promise<boolean> {
  const phone = normalizePhone(rawPhone);
  const row = await db.query.otpCodes.findFirst({
    where: and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt)),
    orderBy: [desc(otpCodes.createdAt)],
  });
  if (!row) return false;
  if (row.expiresAt.getTime() < Date.now()) return false;
  if (row.code !== code) return false;
  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodes.id, row.id));
  return true;
}
