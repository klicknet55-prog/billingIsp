import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenantApiKeys } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

const KEY_PREFIX = "nm_live_";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKeyPlain(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function apiKeyDisplayPrefix(raw: string): string {
  return raw.slice(0, 8);
}

function safeCompareHash(stored: string, candidate: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(candidate, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function listTenantApiKeys(tenantId: string) {
  return db.query.tenantApiKeys.findMany({
    where: and(eq(tenantApiKeys.tenantId, tenantId), isNull(tenantApiKeys.revokedAt)),
    orderBy: [desc(tenantApiKeys.createdAt)],
    columns: {
      id: true,
      label: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function createTenantApiKey(tenantId: string, label: string) {
  const plain = generateApiKeyPlain();
  const id = newId("apk");
  await db.insert(tenantApiKeys).values({
    id,
    tenantId,
    label: label.trim() || "Default",
    keyPrefix: apiKeyDisplayPrefix(plain),
    keyHash: hashApiKey(plain),
  });
  return { id, plain, prefix: apiKeyDisplayPrefix(plain), label: label.trim() || "Default" };
}

export async function revokeTenantApiKey(tenantId: string, keyId: string) {
  const row = await db.query.tenantApiKeys.findFirst({
    where: and(
      eq(tenantApiKeys.id, keyId),
      eq(tenantApiKeys.tenantId, tenantId),
      isNull(tenantApiKeys.revokedAt)
    ),
  });
  if (!row) return false;
  await db
    .update(tenantApiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(tenantApiKeys.id, keyId));
  return true;
}

export async function verifyApiKey(raw: string): Promise<{ tenantId: string; keyId: string } | null> {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(KEY_PREFIX) || trimmed.length < 16) return null;

  const keyHash = hashApiKey(trimmed);
  const row = await db.query.tenantApiKeys.findFirst({
    where: and(eq(tenantApiKeys.keyHash, keyHash), isNull(tenantApiKeys.revokedAt)),
  });
  if (!row || !safeCompareHash(row.keyHash, keyHash)) return null;

  void db
    .update(tenantApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(tenantApiKeys.id, row.id));

  return { tenantId: row.tenantId, keyId: row.id };
}
