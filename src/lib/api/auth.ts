import "server-only";
import { verifyApiKey } from "@/features/api-keys/service";
import { checkRateLimit } from "./rate-limit";
import { apiError } from "./response";

export type ApiAuthContext = {
  tenantId: string;
  keyId: string;
};

export type ApiAuthResult =
  | { ok: true; ctx: ApiAuthContext }
  | { ok: false; response: Response };

export async function authenticateApiRequest(req: Request): Promise<ApiAuthResult> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, response: apiError(401, "UNAUTHORIZED", "Missing Bearer token.") };
  }

  const raw = header.slice(7).trim();
  if (!raw) {
    return { ok: false, response: apiError(401, "UNAUTHORIZED", "Empty Bearer token.") };
  }

  const verified = await verifyApiKey(raw);
  if (!verified) {
    return { ok: false, response: apiError(401, "UNAUTHORIZED", "Invalid or revoked API key.") };
  }

  const rate = checkRateLimit(verified.keyId);
  if (!rate.allowed) {
    const res = apiError(429, "RATE_LIMITED", "Rate limit exceeded. Try again later.");
    res.headers.set("Retry-After", String(rate.retryAfterSec));
    return { ok: false, response: res };
  }

  return { ok: true, ctx: verified };
}
