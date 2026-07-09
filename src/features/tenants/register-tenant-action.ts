"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/features/auth/actions";
import { normalizePhone, requestOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import {
  assertTenantRegisterPhoneAvailable,
  isTenantRegisterPhoneTaken,
} from "./register-phone";
import { registerTenant } from "./service";

/** Kirim OTP verifikasi ke no. WA sebelum pendaftaran tenant. */
export async function requestTenantRegisterOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const phoneError = await assertTenantRegisterPhoneAvailable(
    String(formData.get("adminPhone") ?? "")
  );
  if (phoneError) return { error: phoneError };

  const phone = normalizePhone(String(formData.get("adminPhone") ?? ""));
  try {
    await requestOtp(phone);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal mengirim kode verifikasi. Coba lagi.",
    };
  }
  return { ok: true };
}

/** Server action khusus form pendaftaran tenant (terpisah dari actions.ts besar). */
export async function registerTenantFormAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (formData.get("acceptTerms") !== "on") {
    return { error: "Anda harus menyetujui Syarat & Ketentuan untuk mendaftar." };
  }

  const adminPhone = String(formData.get("adminPhone") ?? "");
  const otpCode = String(formData.get("otpCode") ?? "").trim();
  if (!otpCode) {
    return { error: "Verifikasi WhatsApp wajib. Kirim dan masukkan kode OTP." };
  }

  const phoneError = await assertTenantRegisterPhoneAvailable(adminPhone);
  if (phoneError) return { error: phoneError };

  const phone = normalizePhone(adminPhone);
  if (!(await verifyOtp(phone, otpCode))) {
    return { error: "Kode OTP salah atau kedaluwarsa. Minta kode baru." };
  }

  if (await isTenantRegisterPhoneTaken(phone)) {
    return { error: "No. WhatsApp sudah terdaftar untuk tenant lain." };
  }

  const result = await registerTenant({
    namaUsaha: String(formData.get("namaUsaha") ?? ""),
    domain: String(formData.get("domain") ?? ""),
    adminNama: String(formData.get("adminNama") ?? ""),
    adminPhone,
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    packageId: String(formData.get("packageId") ?? ""),
    billingPeriod:
      String(formData.get("billingPeriod") ?? "monthly") === "yearly" ? "yearly" : "monthly",
    referralCode: String(formData.get("referralCode") ?? "").trim() || undefined,
  });

  if ("error" in result) return { error: result.error };
  if ("checkoutUrl" in result) redirect(result.checkoutUrl);

  await createSession({
    subjectType: "user",
    subjectId: result.owner.id,
    tenantId: result.tenant.id,
  });
  redirect("/dashboard");
}
