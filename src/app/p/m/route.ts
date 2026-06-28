import { type NextRequest } from "next/server";
import { handlePortalMagicLinkRequest } from "@/lib/auth/portal-magic-handler";

/** Path pendek magic link bayar (hemat karakter di WhatsApp). */
export async function GET(req: NextRequest) {
  return handlePortalMagicLinkRequest(req);
}
