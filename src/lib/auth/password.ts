import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hashing password berbasis scrypt (Node crypto). Format tersimpan: `salt:hash`.
 * Modul ini diisolasi agar mudah diganti bila beralih ke library lain.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const testBuf = scryptSync(password, salt, 64);
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf);
}
