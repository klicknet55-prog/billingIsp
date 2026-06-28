import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const LINK_DAYS = Number(process.env.PORTAL_MAGIC_LINK_DAYS ?? 14);
const DEFAULT_REDIRECT = "/portal/tagihan";
/** Path pendek untuk link bayar WA (hemat karakter). Legacy: /portal/masuk */
const SHORT_MAGIC_PATH = "/p/m";
const LEGACY_MAGIC_PATH = "/portal/masuk";
/** Tanda tangan compact 64-bit (~11 char) — cukup untuk link ber-expiry + AUTH_SECRET. */
const COMPACT_SIG_BYTES = 8;
/** Link compact deploy sebelumnya (128-bit) — tetap diterima saat verifikasi. */
const LEGACY_COMPACT_SIG_BYTES = 16;

interface PortalLinkClaimsLegacy {
  sub: string;
  tid: string;
  redirect: string;
  exp: number;
}

interface PortalLinkClaimsCompact {
  s: string;
  t: string;
  e: number;
}

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET wajib diset untuk magic link portal.");
  return secret;
}

function magicLinkPath(): string {
  const fromEnv = process.env.PORTAL_MAGIC_LINK_PATH?.trim();
  if (fromEnv?.startsWith("/")) return fromEnv;
  return SHORT_MAGIC_PATH;
}

function signPayload(data: string, secret: string, compact: boolean): string {
  const hmac = createHmac("sha256", secret).update(data);
  if (compact) {
    return hmac.digest().subarray(0, COMPACT_SIG_BYTES).toString("base64url");
  }
  return hmac.digest("base64url");
}

function verifySignature(data: string, sig: string, secret: string): boolean {
  const full = createHmac("sha256", secret).update(data).digest();
  const candidates = [
    full.toString("base64url"),
    full.subarray(0, LEGACY_COMPACT_SIG_BYTES).toString("base64url"),
    full.subarray(0, COMPACT_SIG_BYTES).toString("base64url"),
  ];
  for (const expected of candidates) {
    try {
      if (sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        return true;
      }
    } catch {
      /* length mismatch */
    }
  }
  return false;
}

/** Buat URL masuk portal tanpa OTP (valid beberapa hari, bisa dipakai ulang). */
export function createPortalMagicLink(
  tenantId: string,
  pelangganId: string,
  redirectPath = DEFAULT_REDIRECT
): string {
  const exp = Math.floor(Date.now() / 1000) + LINK_DAYS * 24 * 60 * 60;
  const useCompact = redirectPath === DEFAULT_REDIRECT;

  let data: string;
  if (useCompact) {
    const payload: PortalLinkClaimsCompact = { s: pelangganId, t: tenantId, e: exp };
    data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  } else {
    const payload: PortalLinkClaimsLegacy = {
      sub: pelangganId,
      tid: tenantId,
      redirect: redirectPath,
      exp,
    };
    data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  }

  const sig = signPayload(data, signingSecret(), useCompact);
  const token = `${data}.${sig}`;

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const path = `${magicLinkPath()}?t=${token}`;
  return base ? `${base}${path}` : path;
}

export function verifyPortalMagicToken(
  token: string
): Pick<PortalLinkClaimsLegacy, "sub" | "tid" | "redirect"> | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const secret = signingSecret();

  if (!verifySignature(data, sig, secret)) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }

  const sub = typeof parsed.sub === "string" ? parsed.sub : typeof parsed.s === "string" ? parsed.s : "";
  const tid = typeof parsed.tid === "string" ? parsed.tid : typeof parsed.t === "string" ? parsed.t : "";
  const expRaw = parsed.exp ?? parsed.e;
  const exp = typeof expRaw === "number" ? expRaw : Number(expRaw);

  if (!sub || !tid || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const redirect =
    typeof parsed.redirect === "string" && parsed.redirect.startsWith("/portal")
      ? parsed.redirect
      : DEFAULT_REDIRECT;

  return { sub, tid, redirect };
}

/** Path lama — link yang sudah terkirim tetap valid. */
export { LEGACY_MAGIC_PATH, SHORT_MAGIC_PATH };
