import { NextResponse } from "next/server";
import { buildPortalMobileBootstrapHtml } from "@/lib/mobile/portal-mobile-bootstrap";

/** Entry point Capacitor MyWiFi — redirect cepat ke deep link atau login. */
export async function GET() {
  return new NextResponse(buildPortalMobileBootstrapHtml(), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
