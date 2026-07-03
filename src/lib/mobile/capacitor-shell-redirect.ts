import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAppOrigin } from "@/lib/site-server";

const SHELL_UA = /mywificapacitorshell|netmanagecapacitorshell/i;

function withPortalAppParam(path: string): string {
  const url = new URL(path, "https://placeholder.local");
  if (url.pathname.startsWith("/portal") || url.pathname.startsWith("/p/")) {
    url.searchParams.set("nm_app", "portal");
  }
  return `${url.pathname}${url.search}`;
}

/** Redirect portal — URL absolut di shell Capacitor (hindari https://localhost). */
export async function redirectPortalShell(path: string): Promise<never> {
  const target = withPortalAppParam(path);
  const h = await headers();
  const ua = h.get("user-agent") ?? "";

  if (SHELL_UA.test(ua)) {
    const origin =
      (await getAppOrigin()) ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "";
    if (origin) {
      redirect(new URL(target, `${origin}/`).toString());
    }
  }

  redirect(target);
}

export async function isCapacitorShellRequest(): Promise<boolean> {
  const h = await headers();
  return SHELL_UA.test(h.get("user-agent") ?? "");
}
