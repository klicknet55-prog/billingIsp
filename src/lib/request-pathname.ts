import "server-only";
import { headers } from "next/headers";

/** Pathname permintaan saat ini — dari proxy, fallback Next/referer. */
export async function getRequestPathname(): Promise<string> {
  const h = await headers();
  const fromProxy = h.get("x-pathname")?.trim();
  if (fromProxy) return fromProxy;

  const nextUrl = h.get("next-url") ?? h.get("x-url");
  if (nextUrl) {
    if (nextUrl.startsWith("/")) return nextUrl.split("?")[0] ?? nextUrl;
    try {
      return new URL(nextUrl).pathname;
    } catch {
      /* ignore */
    }
  }

  const referer = h.get("referer");
  if (referer) {
    try {
      return new URL(referer).pathname;
    } catch {
      /* ignore */
    }
  }

  return "";
}
