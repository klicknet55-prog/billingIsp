import "server-only";

import { resolveAppOrigin } from "@/lib/site";

/** Origin aplikasi dari header request (server component / route handler). */
export async function getAppOrigin(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return resolveAppOrigin(
    h.get("x-forwarded-host") ?? h.get("host"),
    h.get("x-forwarded-proto")
  );
}
