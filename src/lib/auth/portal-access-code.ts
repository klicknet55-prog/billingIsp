import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { portalAccessCodes } from "@/lib/db/schema";
import { wrapPortalPayUrlForMessaging } from "@/lib/mobile/portal-apk-link";

const LINK_DAYS = Number(process.env.PORTAL_MAGIC_LINK_DAYS ?? 14);
const CODE_LENGTH = Math.min(
  12,
  Math.max(6, Number(process.env.PORTAL_ACCESS_CODE_LENGTH ?? 7) || 7)
);
const DEFAULT_REDIRECT = "/portal/tagihan";
/** Tanpa 0/O/1/l/i — aman dibaca & diketik di HP. */
const CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const CODE_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{6,12}$/;

function generateRawCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRawCode();
    const taken = await db.query.portalAccessCodes.findFirst({
      where: eq(portalAccessCodes.code, code),
    });
    if (!taken) return code;
  }
  throw new Error("Gagal membuat kode portal unik.");
}

export function buildPortalAccessUrl(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const path = `/p/${code}`;
  return base ? `${base}${path}` : path;
}

/** Link bayar untuk WA/SMS — APK MyWiFi dulu, fallback browser. */
export function buildPortalPayMessagingUrl(code: string): string {
  return wrapPortalPayUrlForMessaging(buildPortalAccessUrl(code));
}

/** Buat atau pakai ulang kode pendek multi-hari untuk link bayar WA. */
export async function createPortalPayLink(
  tenantId: string,
  pelangganId: string,
  redirectPath = DEFAULT_REDIRECT
): Promise<string> {
  const now = new Date();
  const existing = await db.query.portalAccessCodes.findFirst({
    where: and(
      eq(portalAccessCodes.tenantId, tenantId),
      eq(portalAccessCodes.pelangganId, pelangganId),
      eq(portalAccessCodes.redirect, redirectPath),
      gt(portalAccessCodes.expiresAt, now)
    ),
  });
  if (existing) return buildPortalPayMessagingUrl(existing.code);

  const expiresAt = new Date(now.getTime() + LINK_DAYS * 24 * 60 * 60 * 1000);
  const code = await generateUniqueCode();
  await db.insert(portalAccessCodes).values({
    code,
    tenantId,
    pelangganId,
    redirect: redirectPath,
    expiresAt,
  });
  return buildPortalPayMessagingUrl(code);
}

export async function resolvePortalAccessCode(code: string): Promise<{
  tenantId: string;
  pelangganId: string;
  redirect: string;
} | null> {
  const normalized = code.trim().toLowerCase();
  if (!CODE_PATTERN.test(normalized)) return null;

  const row = await db.query.portalAccessCodes.findFirst({
    where: eq(portalAccessCodes.code, normalized),
  });
  if (!row || row.expiresAt.getTime() < Date.now()) return null;

  const redirect =
    row.redirect.startsWith("/portal") ? row.redirect : DEFAULT_REDIRECT;

  return {
    tenantId: row.tenantId,
    pelangganId: row.pelangganId,
    redirect,
  };
}

/** Hapus kode kedaluwarsa (dipanggil dari cron billing). */
export async function cleanupExpiredPortalAccessCodes(): Promise<void> {
  await db.delete(portalAccessCodes).where(lt(portalAccessCodes.expiresAt, new Date()));
}
