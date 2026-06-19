import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const LINK_DAYS = Number(process.env.PORTAL_MAGIC_LINK_DAYS ?? 14);

interface PortalLinkClaims {
  sub: string;
  tid: string;
  redirect: string;
  exp: number;
}

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET wajib diset untuk magic link portal.");
  return secret;
}

/** Buat URL masuk portal tanpa OTP (valid beberapa hari, bisa dipakai ulang). */
export function createPortalMagicLink(
  tenantId: string,
  pelangganId: string,
  redirectPath = "/portal/tagihan"
): string {
  const exp = Math.floor(Date.now() / 1000) + LINK_DAYS * 24 * 60 * 60;
  const payload: PortalLinkClaims = {
    sub: pelangganId,
    tid: tenantId,
    redirect: redirectPath,
    exp,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", signingSecret()).update(data).digest("base64url");
  const token = `${data}.${sig}`;

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const path = `/portal/masuk?t=${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

export function verifyPortalMagicToken(
  token: string
): Pick<PortalLinkClaims, "sub" | "tid" | "redirect"> | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", signingSecret()).update(data).digest("base64url");

  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  let parsed: Partial<PortalLinkClaims>;
  try {
    parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as Partial<PortalLinkClaims>;
  } catch {
    return null;
  }

  if (!parsed.sub || !parsed.tid || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const redirect =
    typeof parsed.redirect === "string" && parsed.redirect.startsWith("/portal")
      ? parsed.redirect
      : "/portal/tagihan";

  return { sub: parsed.sub, tid: parsed.tid, redirect };
}
