"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import {
  assignTenantToSales,
  createSalesCommissionPayoutRequest,
  createSalesAccount,
  percentToBasisPoints,
  paySalesCommissionPayoutRequest,
  reverseSalesCommission,
  reviewSalesCommissionPayoutRequest,
  rotateSalesReferralCode,
  updateSalesProfile,
} from "./service";

function salesManagementRedirect(key: "error" | "success", message: string): never {
  redirect(`/superadmin/sales?${key}=${encodeURIComponent(message)}`);
}

const createSalesSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(120),
  email: z.string().trim().email("Email tidak valid").max(254),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(128),
  feePercent: z.coerce.number().min(0).max(100).multipleOf(0.01),
});

export async function createSalesAccountAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const parsed = createSalesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    salesManagementRedirect("error", parsed.error.issues[0]?.message ?? "Data akun tidak valid.");
  }
  try {
    await createSalesAccount({
      nama: parsed.data.nama,
      email: parsed.data.email,
      password: parsed.data.password,
      commissionRateBps: percentToBasisPoints(parsed.data.feePercent),
    });
  } catch (error) {
    salesManagementRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal membuat akun sales."
    );
  }
  revalidatePath("/superadmin/sales");
  salesManagementRedirect("success", "Akun sales berhasil dibuat.");
}

const updateSalesSchema = z.object({
  salesUserId: z.string().min(1),
  feePercent: z.coerce.number().min(0).max(100).multipleOf(0.01),
});

export async function updateSalesProfileAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const parsed = updateSalesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    salesManagementRedirect("error", parsed.error.issues[0]?.message ?? "Data profil tidak valid.");
  }
  try {
    await updateSalesProfile({
      salesUserId: parsed.data.salesUserId,
      commissionRateBps: percentToBasisPoints(parsed.data.feePercent),
      isActive: formData.get("isActive") === "on",
    });
  } catch (error) {
    salesManagementRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal memperbarui profil sales."
    );
  }
  revalidatePath("/superadmin/sales");
  revalidatePath("/sales");
  salesManagementRedirect("success", "Profil sales diperbarui.");
}

export async function rotateSalesReferralCodeAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const salesUserId = String(formData.get("salesUserId") ?? "");
  if (!salesUserId) salesManagementRedirect("error", "Akun sales tidak valid.");
  try {
    await rotateSalesReferralCode(salesUserId);
  } catch (error) {
    salesManagementRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal mengganti kode referral."
    );
  }
  revalidatePath("/superadmin/sales");
  revalidatePath("/sales");
  salesManagementRedirect("success", "Kode referral sales berhasil diganti.");
}

const assignSalesSchema = z.object({
  tenantId: z.string().min(1),
  salesUserId: z.string().min(1),
  reason: z.string().trim().min(5, "Alasan minimal 5 karakter").max(500),
});

export async function assignTenantToSalesAction(formData: FormData) {
  const admin = await requireUser(["superadmin"]);
  const parsed = assignSalesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    salesManagementRedirect("error", parsed.error.issues[0]?.message ?? "Atribusi tidak valid.");
  }
  try {
    await assignTenantToSales({
      tenantId: parsed.data.tenantId,
      salesUserId: parsed.data.salesUserId,
      changedBy: admin.id,
      source: "manual",
      confirmed: formData.get("confirm") === "on",
      reason: parsed.data.reason,
    });
  } catch (error) {
    salesManagementRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal mengubah atribusi tenant."
    );
  }
  revalidatePath("/superadmin/sales");
  revalidatePath("/sales");
  salesManagementRedirect("success", "Atribusi tenant diperbarui dan dicatat di audit.");
}

function salesRedirect(key: "error" | "success", message: string): never {
  redirect(`/sales?${key}=${encodeURIComponent(message)}`);
}

const payoutRequestSchema = z.object({
  payoutMethod: z.string().trim().min(2, "Metode pencairan wajib diisi.").max(60),
  accountName: z.string().trim().min(2, "Nama pemilik rekening wajib diisi.").max(120),
  accountNumber: z.string().trim().min(4, "Nomor rekening/e-wallet tidak valid.").max(80),
});

export async function requestSalesCommissionPayoutAction(formData: FormData) {
  const sales = await requireUser(["sales"]);
  const parsed = payoutRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    salesRedirect("error", parsed.error.issues[0]?.message ?? "Data pencairan tidak valid.");
  }
  let request: { id: string; amount: number };
  try {
    request = await createSalesCommissionPayoutRequest({
      salesUserId: sales.id,
      payoutMethod: parsed.data.payoutMethod,
      accountName: parsed.data.accountName,
      accountNumber: parsed.data.accountNumber,
    });
  } catch (error) {
    salesRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal mengajukan pencairan komisi."
    );
  }
  revalidatePath("/sales");
  revalidatePath("/superadmin/sales");
  salesRedirect("success", `Permintaan pencairan ${formatRupiah(request.amount)} diajukan.`);
}

const reviewPayoutSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

export async function reviewSalesCommissionPayoutRequestAction(formData: FormData) {
  const admin = await requireUser(["superadmin"]);
  const parsed = reviewPayoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    salesManagementRedirect("error", parsed.error.issues[0]?.message ?? "Data peninjauan tidak valid.");
  }
  if (parsed.data.decision === "reject" && (parsed.data.rejectionReason?.length ?? 0) < 5) {
    salesManagementRedirect("error", "Alasan penolakan minimal 5 karakter.");
  }
  try {
    await reviewSalesCommissionPayoutRequest({
      requestId: parsed.data.requestId,
      reviewerId: admin.id,
      decision: parsed.data.decision,
      rejectionReason: parsed.data.rejectionReason,
    });
  } catch (error) {
    salesManagementRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal meninjau permintaan pencairan."
    );
  }
  revalidatePath("/superadmin/sales");
  revalidatePath("/sales");
  salesManagementRedirect(
    "success",
    parsed.data.decision === "approve" ? "Permintaan pencairan disetujui." : "Permintaan pencairan ditolak."
  );
}

const payoutSchema = z.object({
  requestId: z.string().min(1),
  payoutReference: z.string().trim().min(1, "Referensi pembayaran wajib diisi").max(160),
});

export async function paySalesCommissionPayoutRequestAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const parsed = payoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    salesManagementRedirect("error", parsed.error.issues[0]?.message ?? "Data pencairan tidak valid.");
  }
  try {
    await paySalesCommissionPayoutRequest(parsed.data);
  } catch (error) {
    salesManagementRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal mencatat pencairan komisi."
    );
  }
  revalidatePath("/superadmin/sales");
  revalidatePath("/sales");
  salesManagementRedirect("success", "Pembayaran permintaan pencairan dicatat.");
}

const reverseSchema = z.object({
  commissionId: z.string().min(1),
  reason: z.string().trim().min(5, "Alasan minimal 5 karakter").max(500),
});

export async function reverseSalesCommissionAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const parsed = reverseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    salesManagementRedirect("error", parsed.error.issues[0]?.message ?? "Alasan pembalikan tidak valid.");
  }
  try {
    await reverseSalesCommission(parsed.data);
  } catch (error) {
    salesManagementRedirect(
      "error",
      error instanceof Error ? error.message : "Gagal membalik komisi."
    );
  }
  revalidatePath("/superadmin/sales");
  revalidatePath("/sales");
  salesManagementRedirect("success", "Pembalikan komisi dan alasan tercatat.");
}
