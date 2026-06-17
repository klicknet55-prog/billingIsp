import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function getMasterSecret(): string {
  // AUTH_SECRET sudah wajib ada di aplikasi ini; dipakai juga untuk enkripsi credential.
  return process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
}

/**
 * Enkripsi AES-256-GCM untuk credential integrasi tenant.
 * Format output: base64(iv):base64(tag):base64(ciphertext)
 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const key = keyFromSecret(getMasterSecret());
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !encB64) throw new Error("Payload enkripsi tidak valid");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const key = keyFromSecret(getMasterSecret());
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

