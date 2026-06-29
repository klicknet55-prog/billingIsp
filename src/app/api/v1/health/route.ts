import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    ok: true,
    tenantId: auth.ctx.tenantId,
    appVersion: process.env.npm_package_version ?? "1.0.0",
  });
}
