import { type NextRequest } from "next/server";
import { handlePortalAccessCodeRequest } from "@/lib/auth/portal-magic-handler";

type RouteContext = { params: Promise<{ code: string }> };

/** Link bayar pendek: /p/{code} */
export async function GET(req: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  return handlePortalAccessCodeRequest(req, code);
}
