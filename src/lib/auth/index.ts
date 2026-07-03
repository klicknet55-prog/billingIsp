import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pelanggan, tenants, users, type Pelanggan, type User } from "@/lib/db/schema";
import { redirectPortalShell } from "@/lib/mobile/capacitor-shell-redirect";
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
    if (tenant?.status === "suspended") return "suspended";
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

// ---------------------------------------------------------------------------
// Guard untuk dipakai di layout/page/server action
// ---------------------------------------------------------------------------

/** Wajib login sebagai staf dengan salah satu role; jika tidak, redirect ke /login. */
export async function requireUser(roles?: readonly StaffRole[]): Promise<User> {
  const actor = await getCurrentActor();
  if (!actor || actor.type !== "user") redirect("/login");
  if (roles && !roles.includes(actor.user.role)) redirect("/login?error=forbidden");

  if (actor.user.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, actor.user.tenantId),
    });
    if (tenant?.status === "suspended") redirect("/login?error=suspended");
  }

  return actor.user;
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
    if (actor.user.tenantId) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, actor.user.tenantId),
      });
      if (tenant?.status === "suspended") return;
    }
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
