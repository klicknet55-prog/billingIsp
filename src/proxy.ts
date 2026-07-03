import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (pengganti middleware di Next 16): pemeriksaan ringan keberadaan cookie
 * session lalu mengarahkan pengunjung anonim. Penegakan peran & tenant dilakukan
 * di layout/page (runtime Node, punya akses DB) lewat `requireUser`/`requirePelanggan`.
 */
const STAFF_PREFIXES = ["/superadmin", "/dashboard", "/kolektor"];
const COOKIE = "nm_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(COOKIE);

  const isStaffArea = STAFF_PREFIXES.some((p) => pathname.startsWith(p));
  const isPortalArea =
    pathname.startsWith("/portal") &&
    pathname !== "/portal/login" &&
    pathname !== "/portal/masuk" &&
    pathname !== "/portal/mobile-bootstrap";

  if (!hasSession && isStaffArea) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (!hasSession && isPortalArea) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*", "/dashboard/:path*", "/kolektor/:path*", "/portal/:path*"],
};
