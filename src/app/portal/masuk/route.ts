import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { loginPelanggan } from "@/lib/auth";
import { verifyPortalMagicToken } from "@/lib/auth/portal-link";
import { db } from "@/lib/db";
import { pelanggan } from "@/lib/db/schema";

/** Magic link dari WhatsApp: buat session pelanggan lalu arahkan ke tagihan. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) {
    return NextResponse.redirect(new URL("/portal/login?error=link", req.url));
  }

  let claims: ReturnType<typeof verifyPortalMagicToken>;
  try {
    claims = verifyPortalMagicToken(token);
  } catch {
    return NextResponse.redirect(new URL("/portal/login?error=config", req.url));
  }

  if (!claims) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", req.url));
  }

  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.id, claims.sub), eq(pelanggan.tenantId, claims.tid)),
  });
  if (!cust) {
    return NextResponse.redirect(new URL("/portal/login?error=invalid", req.url));
  }

  await loginPelanggan(cust);
  return NextResponse.redirect(new URL(claims.redirect, req.url));
}
