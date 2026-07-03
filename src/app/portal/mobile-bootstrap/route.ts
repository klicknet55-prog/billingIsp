import { NextResponse } from "next/server";
import { buildPortalMobileBootstrapHtml } from "@/lib/mobile/portal-mobile-bootstrap";
import { getAppOrigin } from "@/lib/site-server";

/** Entry point Capacitor MyWiFi — redirect cepat ke deep link atau login. */
export async function GET() {
  const origin =
    (await getAppOrigin()) ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://isp.tunnelhost.my.id";

  return new NextResponse(buildPortalMobileBootstrapHtml(origin), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
