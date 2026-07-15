import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureUrlScheme } from "@/lib/site";
import { getAppOrigin } from "@/lib/site-server";

const SHELL_UA = /mywificapacitorshell|netmanagecapacitorshell|admin\.netcapacitorshell/i;

function withPortalAppParam(path: string): string {
  const url = new URL(path, "https://placeholder.local");
  if (url.pathname.startsWith("/portal") || url.pathname.startsWith("/p/")) {
    url.searchParams.set("nm_app", "portal");
  }
  return `${url.pathname}${url.search}`;
}

function withAdminAppParam(path: string): string {
  const url = new URL(path, "https://placeholder.local");
  if (
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/kolektor") ||
    url.pathname.startsWith("/login")
  ) {
    if (!url.searchParams.has("nm_app")) url.searchParams.set("nm_app", "admin");
  }
  return `${url.pathname}${url.search}`;
}

/** Origin aman untuk Capacitor — jangan arahkan WebView ke localhost. */
async function resolveShellOrigin(): Promise<string> {
  const fromRequest = (await getAppOrigin()).replace(/\/$/, "");
  if (fromRequest && !/localhost|127\.0\.0\.1/i.test(fromRequest)) {
    return fromRequest;
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
    ? ensureUrlScheme(process.env.NEXT_PUBLIC_APP_URL.trim()).replace(/\/$/, "")
    : "";
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    return fromEnv;
  }

  return fromRequest || fromEnv || "";
}

export async function isCapacitorShellRequest(): Promise<boolean> {
  const h = await headers();
  return SHELL_UA.test(h.get("user-agent") ?? "");
}

/** Redirect portal — URL absolut di shell Capacitor (hindari https://localhost). */
export async function redirectPortalShell(path: string): Promise<never> {
  const target = withPortalAppParam(path);
  if (await isCapacitorShellRequest()) {
    const origin = await resolveShellOrigin();
    if (origin) {
      redirect(new URL(target, `${origin}/`).toString());
    }
  }
  redirect(target);
}

/** Redirect staf setelah login di Admin.net APK. */
export async function redirectStaffShell(path: string): Promise<never> {
  const target = withAdminAppParam(path);
  if (await isCapacitorShellRequest()) {
    const origin = await resolveShellOrigin();
    if (origin) {
      redirect(new URL(target, `${origin}/`).toString());
    }
  }
  redirect(target);
}
