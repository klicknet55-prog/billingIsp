"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { normalizePhone, verifyOtp } from "@/lib/auth/otp";
import { createSession } from "@/lib/auth/session";
import type { ActionState } from "@/features/auth/actions";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { newId } from "@/lib/utils";
import { parseForm } from "@/lib/validation";
import {
  assertTenantRegisterPhoneAvailable,
  isTenantRegisterPhoneTaken,
} from "./register-phone";
import { parsePackageFeaturesFromForm } from "./saas-features";
import {
  changeTenantSubscriptionPackage,
  calculateSaasPackageAmount,
  createSaasPackage,
  deleteSaasPackage,
  deleteTenantIfInactive,
  extendTenantSubscription,
  getTenantSubscriptionStatus,
  listActiveSaasPackages,
  logSaasTransaction,
  normalizeSaasBillingPeriod,
  registerTenant,
  setTenantStatus,
  updateSaasPackage,
} from "./service";

function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function registerTenantAction(
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
    adminPhone: String(formData.get("adminPhone") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    packageId: String(formData.get("packageId") ?? ""),
    billingPeriod: String(formData.get("billingPeriod") ?? "monthly") === "yearly" ? "yearly" : "monthly",
  });
  if ("error" in result) return { error: result.error };
  if ("checkoutUrl" in result) {
    redirect(result.checkoutUrl);
  }

  await createSession({
    subjectType: "user",
    subjectId: result.owner.id,
    tenantId: result.tenant.id,
  });
  redirect("/dashboard");
}

export async function setTenantStatusAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "active" | "suspended";
  await setTenantStatus(id, status);
  revalidatePath("/superadmin/tenants");
}

export async function extendTenantSubscriptionAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  const daysRaw = String(formData.get("days") ?? "30");
  const days = Number(daysRaw);
  try {
    await extendTenantSubscription(tenantId, {
      days: Number.isFinite(days) && days > 0 ? days : 30,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memperpanjang langganan.";
    redirect(`/superadmin/tenants?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/superadmin/tenants");
  redirect(`/superadmin/tenants?success=${encodeURIComponent("Langganan tenant diperpanjang.")}`);
}

export async function deleteTenantAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const id = String(formData.get("id") ?? "");
  try {
    await deleteTenantIfInactive(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus tenant.";
    redirect(`/superadmin/tenants?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/superadmin/tenants");
}

export async function changeSubscriptionPackageAction(formData: FormData) {
  const user = await requireUser(["owner", "admin"]);
  const tenantId = user.tenantId;
  if (!tenantId) redirect("/login");

  const packageId = String(formData.get("packageId") ?? "");
  const billingPeriod = String(formData.get("billingPeriod") ?? "monthly") === "yearly" ? "yearly" : "monthly";
  const returnTo = String(formData.get("returnTo") ?? "/dashboard/langganan");

  try {
    const current = await getTenantSubscriptionStatus(tenantId);
    const allPackages = await listActiveSaasPackages();
    const nextPkg = allPackages.find((p) => p.id === packageId);
    if (!nextPkg) throw new Error("Paket tujuan tidak ditemukan.");
    const effectiveBillingPeriod = normalizeSaasBillingPeriod(nextPkg, billingPeriod);
    if (current && current.packageId === nextPkg.id) {
      if (current.billingPeriod === effectiveBillingPeriod) {
        throw new Error("Paket dan periode yang dipilih sama dengan langganan aktif saat ini.");
      }
    }
    const amount = calculateSaasPackageAmount(nextPkg, effectiveBillingPeriod);
    const orderId = `SUP-${newId("upg")}`;
    const duitku = getDuitkuClient();
    const trx = await duitku.createTransaction({
      orderId,
      amount,
      productName: `Upgrade paket ${nextPkg.nama} ${effectiveBillingPeriod === "yearly" ? "Tahunan" : "Bulanan"}`,
      customerName: user.nama,
      tenantId,
    });

    if (process.env.DUITKU_DRIVER === "real") {
      await logSaasTransaction({
        tenantId,
        referenceId: `UPG:${nextPkg.id}:${effectiveBillingPeriod}`,
        orderId,
        status: "pending",
        amount,
        paymentMethod: process.env.DUITKU_PAYMENT_METHOD ?? null,
      });
      redirect(trx.paymentUrl);
    }

    const paid = duitku.simulatePaid(orderId, amount);
    await changeTenantSubscriptionPackage(tenantId, nextPkg.id, effectiveBillingPeriod);
    await logSaasTransaction({
      tenantId,
      referenceId: `UPG:${nextPkg.id}:${effectiveBillingPeriod}`,
      orderId,
      status: paid.status,
      amount: paid.amount,
      paymentMethod: paid.paymentMethod,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard", "layout");
    redirect(`${returnTo}?ok=1`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Gagal mengubah paket langganan.";
    redirect(`${returnTo}?error=${encodeURIComponent(msg)}`);
  }
}

const saasPackageSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  hargaBulanan: z.coerce.number().int().min(0, "Harga tidak valid"),
  diskonTahunanPersen: z.coerce.number().int().min(0, "Minimal 0").max(100, "Maksimal 100"),
  maxPelanggan: z.coerce.number().int().min(1, "Minimal 1"),
  maxRouter: z.coerce.number().int().min(1, "Minimal 1"),
  maxVpn: z.coerce.number().int().min(0, "Minimal 0"),
  isActive: z.string().optional(),
});

export async function saveSaasPackageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(saasPackageSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const id = String(formData.get("id") ?? "");
  const input = {
    nama: parsed.data.nama,
    hargaBulanan: parsed.data.hargaBulanan,
    diskonTahunanPersen: parsed.data.diskonTahunanPersen,
    maxPelanggan: parsed.data.maxPelanggan,
    maxRouter: parsed.data.maxRouter,
    maxVpn: parsed.data.maxVpn,
    fitur: parsePackageFeaturesFromForm(formData),
    isActive: parsed.data.isActive === "on",
  };
  if (id) await updateSaasPackage(id, input);
  else await createSaasPackage(input);
  revalidatePath("/superadmin/packages");
  return { ok: true };
}

export async function deleteSaasPackageAction(formData: FormData) {
  await requireUser(["superadmin"]);
  await deleteSaasPackage(String(formData.get("id") ?? ""));
  revalidatePath("/superadmin/packages");
}
