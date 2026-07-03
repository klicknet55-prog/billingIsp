import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { loginPelanggan } from "@/lib/auth";
import { resolvePortalAccessCode } from "@/lib/auth/portal-access-code";
import { verifyPortalMagicToken } from "@/lib/auth/portal-link";
import { db } from "@/lib/db";
import { pelanggan } from "@/lib/db/schema";
import {
  buildPortalPayLandingHtml,
  shouldShowPortalPayLanding,
} from "@/lib/mobile/portal-pay-landing";
import { getAppOrigin } from "@/lib/site-server";

function withPortalShellParam(path: string): string {
  const url = new URL(path, "https://placeholder.local");
  if (url.pathname.startsWith("/portal") || url.pathname.startsWith("/p/")) {
    url.searchParams.set("nm_app", "portal");
  }
  return `${url.pathname}${url.search}`;
}

async function redirectTo(path: string, req: NextRequest) {
  const origin =
    (await getAppOrigin()) ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;
  return NextResponse.redirect(new URL(withPortalShellParam(path), `${origin}/`));
}

/** Magic link signed token (/p/m, /portal/masuk) — legacy. */
export async function handlePortalMagicLinkRequest(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return redirectTo("/portal/login?error=link", req);
  }

  let claims: ReturnType<typeof verifyPortalMagicToken>;
  try {
    claims = verifyPortalMagicToken(token);
  } catch {
    return redirectTo("/portal/login?error=config", req);
  }

  if (!claims) {
    return redirectTo("/portal/login?error=expired", req);
  }

  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.id, claims.sub), eq(pelanggan.tenantId, claims.tid)),
  });
  if (!cust) {
    return redirectTo("/portal/login?error=invalid", req);
  }

  await loginPelanggan(cust);
  return redirectTo(claims.redirect, req);
}

async function resolveAppOrigin(req: NextRequest): Promise<string> {
  return (
    (await getAppOrigin()) ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin
  );
}

/** Kode pendek DB (/p/{code}) — link bayar WA utama. */
export async function handlePortalAccessCodeRequest(req: NextRequest, code: string) {
  const claims = await resolvePortalAccessCode(code);
  if (!claims) {
    return redirectTo("/portal/login?error=expired", req);
  }

  const userAgent = req.headers.get("user-agent") ?? "";

  if (shouldShowPortalPayLanding(userAgent, req.nextUrl.searchParams)) {
    const origin = await resolveAppOrigin(req);
    const normalizedCode = code.trim().toLowerCase();
    const appOpenUrl = `${origin}/p/${normalizedCode}?nm_app=portal`;
    const browserContinueUrl = `${origin}/p/${normalizedCode}?browser=1`;
    const html = buildPortalPayLandingHtml({ appOpenUrl, browserContinueUrl });
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.id, claims.pelangganId), eq(pelanggan.tenantId, claims.tenantId)),
  });
  if (!cust) {
    return redirectTo("/portal/login?error=invalid", req);
  }

  await loginPelanggan(cust);
  return redirectTo(claims.redirect, req);
}
