"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  dashboardPathForRole,
  loginPelanggan,
  loginStaff,
  logout,
} from "@/lib/auth";
import { normalizePhone, requestOtp, verifyOtp } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { pelanggan } from "@/lib/db/schema";

export interface ActionState {
  error?: string;
  ok?: boolean;
  fieldErrors?: Record<string, string>;
}

export async function loginStaffAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await loginStaff(email, password);
  if (!user) return { error: "Email atau kata sandi salah." };
  redirect(dashboardPathForRole(user.role));
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function logoutPortalAction() {
  await logout();
  redirect("/portal/login");
}

export async function requestOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const cust = await db.query.pelanggan.findFirst({
    where: eq(pelanggan.noWa, phone),
  });
  if (!cust) return { error: "Nomor tidak terdaftar sebagai pelanggan." };
  try {
    await requestOtp(phone, cust.tenantId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal mengirim OTP. Coba lagi nanti.",
    };
  }
  return { ok: true };
}

export async function verifyOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "");
  const ok = await verifyOtp(phone, code);
  if (!ok) return { error: "Kode OTP salah atau kedaluwarsa." };
  const cust = await db.query.pelanggan.findFirst({
    where: eq(pelanggan.noWa, phone),
  });
  if (!cust) return { error: "Pelanggan tidak ditemukan." };
  await loginPelanggan(cust);
  redirect("/portal");
}
