import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pelanggan, tenants, users, type Pelanggan, type User } from "@/lib/db/schema";
import { redirectPortalShell } from "@/lib/mobile/capacitor-shell-redirect";
import {
  getStaffAccessMode,
  isRenewalOnlyPath,
  isTenantOnFreePackage,
} from "@/features/tenants/saas-access";
import { verifyPassword } from "./password";
import { createSession, destroySession, getSession } from "./session";

export type StaffRole = User["role"];

function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export interface StaffActor {
  type: "user";
  user: User;
}
export interface CustomerActor {
  type: "pelanggan";
  pelanggan: Pelanggan;
}
export type Actor = StaffActor | CustomerActor;

/** Ambil aktor aktif (staf atau pelanggan) dari session, atau null. */
export async function getCurrentActor(): Promise<Actor | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.subjectType === "user") {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.subjectId),
    });
    return user && user.isActive ? { type: "user", user } : null;
  }
  const cust = await db.query.pelanggan.findFirst({
    where: eq(pelanggan.id, session.subjectId),
  });
  return cust ? { type: "pelanggan", pelanggan: cust } : null;
}

/** Login staf via email + password. */
export async function loginStaff(
  email: string,
  password: string
): Promise<User | null | "suspended"> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });
  if (!user || !user.isActive) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  if (user.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
    });
    if (tenant?.status === "suspended") {
      const canRenew =
        (user.role === "owner" || user.role === "admin") &&
        (await isTenantOnFreePackage(user.tenantId));
      if (!canRenew) return "suspended";
    }
  }

  await createSession({
    subjectType: "user",
    subjectId: user.id,
    tenantId: user.tenantId,
  });
  return user;
}

/** Buat session untuk pelanggan (dipanggil setelah OTP terverifikasi). */
export async function loginPelanggan(p: Pelanggan): Promise<void> {
  await createSession({
    subjectType: "pelanggan",
    subjectId: p.id,
    tenantId: p.tenantId,
  });
}

export async function logout(): Promise<void> {
  await destroySession();
}

export interface RequireUserOptions {
  /** Izinkan owner/admin paket Free yang suspended mengakses halaman perpanjang. */
  allowRenewalOnly?: boolean;
}

async function enforceStaffAccessMode(
  user: User,
  opts?: RequireUserOptions
): Promise<void> {
  const mode = await getStaffAccessMode(user);
  if (mode === "blocked") redirect("/login?error=suspended");
  if (mode === "renewal_only" && !opts?.allowRenewalOnly) {
    redirect("/dashboard/langganan");
  }
}

/** Wajib login sebagai staf dengan salah satu role; jika tidak, redirect ke /login. */
export async function requireUser(
  roles?: readonly StaffRole[],
  opts?: RequireUserOptions
): Promise<User> {
  const actor = await getCurrentActor();
  if (!actor || actor.type !== "user") redirect("/login");
  if (roles && !roles.includes(actor.user.role)) redirect("/login?error=forbidden");
  await enforceStaffAccessMode(actor.user, opts);
  return actor.user;
}

/** Wajib akses penuh tenant (bukan mode perpanjang saja). */
export async function requireFullTenantAccess(
  roles?: readonly StaffRole[]
): Promise<User> {
  return requireUser(roles, { allowRenewalOnly: false });
}

/** Redirect jika mode perpanjang mengakses halaman di luar whitelist (dipakai layout ISP). */
export async function enforceRenewalOnlyRouteGuard(user: User): Promise<void> {
  const mode = await getStaffAccessMode(user);
  if (mode !== "renewal_only") return;
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (!isRenewalOnlyPath(pathname)) {
    redirect("/dashboard/langganan");
  }
}

/** Wajib login sebagai pelanggan; jika tidak, redirect ke portal login. */
export async function requirePelanggan(): Promise<Pelanggan> {
  const actor = await getCurrentActor();
  if (!actor || actor.type !== "pelanggan") redirect("/portal/login");
  return actor.pelanggan;
}

/** Helper: arahkan user ke dashboard sesuai role-nya. */
export function dashboardPathForRole(role: StaffRole): string {
  if (role === "superadmin") return "/superadmin";
  if (role === "kolektor") return "/kolektor";
  return "/dashboard";
}

/** Sudah login staf → dashboard; pelanggan → portal. Dipakai di /login. */
export async function redirectIfAuthenticatedFromStaffLogin(): Promise<void> {
  try {
    const actor = await getCurrentActor();
    if (!actor) return;
    if (actor.type === "pelanggan") {
      redirect("/portal");
    }
    const mode = await getStaffAccessMode(actor.user);
    if (mode === "renewal_only") {
      redirect("/dashboard/langganan");
    }
    if (mode === "blocked") return;
    redirect(dashboardPathForRole(actor.user.role));
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
  }
}

/** Sudah login pelanggan → portal; staf → dashboard. Dipakai di /portal/login. */
export async function redirectIfAuthenticatedFromPortalLogin(): Promise<void> {
  try {
    const actor = await getCurrentActor();
    if (!actor) return;
    if (actor.type === "pelanggan") await redirectPortalShell("/portal");
    if (actor.type === "user") redirect(dashboardPathForRole(actor.user.role));
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
  }
}
