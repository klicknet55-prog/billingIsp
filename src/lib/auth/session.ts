import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

const COOKIE_NAME = "nm_session";
const SESSION_DAYS = 30;

export interface SessionData {
  id: string;
  subjectType: "user" | "pelanggan";
  subjectId: string;
  tenantId: string | null;
}

export async function createSession(data: Omit<SessionData, "id">): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id,
    subjectType: data.subjectType,
    subjectId: data.subjectId,
    tenantId: data.tenantId,
    expiresAt,
  });
  const store = await cookies();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return id;
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return null;
  const row = await db.query.sessions.findFirst({ where: eq(sessions.id, id) });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return {
    id: row.id,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    tenantId: row.tenantId,
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (id) {
    await db.delete(sessions).where(eq(sessions.id, id));
    store.delete(COOKIE_NAME);
  }
}
