import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SEC = 5 * 60; // 5 menit — cukup untuk Custom Tab unduh

export type LaporanDownloadClaims = {
  v: 1;
  kind: "laporan";
  tid: string;
  uid: string;
  format: "pdf" | "xlsx";
  period?: string;
  from?: string;
  to?: string;
  exp: number;
};

export type NotaDownloadClaims = {
  v: 1;
  kind: "nota";
  tid: string;
  uid: string;
  rid: string;
  exp: number;
};

export type DownloadClaims = LaporanDownloadClaims | NotaDownloadClaims;

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
}

export function signDownloadTicket(
  claims:
    | Omit<LaporanDownloadClaims, "v" | "exp">
    | Omit<NotaDownloadClaims, "v" | "exp">
): string {
  const payload = {
    ...claims,
    v: 1 as const,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyDownloadTicket(token: string): DownloadClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DownloadClaims;
    if (claims.v !== 1) return null;
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (claims.kind !== "laporan" && claims.kind !== "nota") return null;
    return claims;
  } catch {
    return null;
  }
}
