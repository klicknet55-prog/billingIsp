"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { payTagihan, payPartialTagihan } from "@/features/billing/payment-service";
import {
  catatNunggakPelanggan,
  getTagihanSummary,
  resolvePayableTagihan,
  resolvePayableBalance,
  type PaymentSelection,
} from "@/features/billing/tagihan-service";
import { tagihanBalance } from "@/features/billing/tagihan-balance";
import { isTenantDuitkuConfigured } from "@/features/integrations/service";
import { tenantHasSaasFeature } from "@/features/tenants/saas-access";
import { requireUser, requirePelanggan } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentGatewayLogs } from "@/lib/db/schema";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { newId } from "@/lib/utils";

function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function parseSelection(v: string): PaymentSelection {
  if (v === "tunggakan" || v === "keduanya") return v;
  return "bulan_ini";
}

export async function payTagihanAction(formData: FormData) {
  const user = await requireUser(["owner", "admin", "kolektor"]);
  const pelangganId = String(formData.get("pelangganId") ?? "");
  const selection = parseSelection(String(formData.get("selection") ?? "bulan_ini"));
  const metode = String(formData.get("metode") ?? "Tunai");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();

  try {
    const result = await payTagihan({
      tenantId: user.tenantId!,
      pelangganId,
      selection,
      metode,
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      createdBy: user.id,
      kolektorUserId: user.role === "kolektor" ? user.id : undefined,
    });
    revalidatePath("/dashboard/tagihan");
    revalidatePath("/dashboard/invoice");
    revalidatePath("/dashboard/pelanggan");
    revalidatePath("/kolektor");
    revalidatePath("/portal/tagihan");
    const redirectTo = String(formData.get("redirectTo") ?? "").trim();
    const pelangganNama = String(formData.get("pelangganNama") ?? "").trim();
    if (redirectTo === "/kolektor") {
      const params = new URLSearchParams({
        paid: "1",
        noNota: result.noNota,
        total: String(result.total),
      });
      if (pelangganNama) params.set("pelanggan", pelangganNama);
      redirect(`${redirectTo}?${params.toString()}`);
    }
    redirect(`/dashboard/nota/${result.receiptId}?success=1`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Pembayaran gagal.";
    const redirectTo = String(formData.get("redirectTo") ?? "").trim();
    if (redirectTo === "/kolektor") {
      redirect(`/kolektor?error=${encodeURIComponent(msg)}`);
    }
    redirect(`/dashboard/tagihan/${pelangganId}?error=${encodeURIComponent(msg)}`);
  }
}

export async function payPartialTagihanAction(formData: FormData) {
  const user = await requireUser(["owner", "admin", "kolektor"]);
  const pelangganId = String(formData.get("pelangganId") ?? "");
  const tagihanId = String(formData.get("tagihanId") ?? "");
  const amount = Number(formData.get("amount"));
  const metode = String(formData.get("metode") ?? "Tunai");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();

  try {
    const result = await payPartialTagihan({
      tenantId: user.tenantId!,
      pelangganId,
      tagihanId,
      amount,
      metode,
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      createdBy: user.id,
      kolektorUserId: user.role === "kolektor" ? user.id : undefined,
    });
    revalidatePath("/dashboard/tagihan");
    revalidatePath(`/dashboard/tagihan/${pelangganId}`);
    revalidatePath("/dashboard/invoice");
    revalidatePath("/portal/tagihan");
    redirect(`/dashboard/nota/${result.receiptId}?success=1`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Pembayaran gagal.";
    redirect(`/dashboard/tagihan/${pelangganId}?error=${encodeURIComponent(msg)}`);
  }
}

export async function catatNunggakAction(formData: FormData) {
  const user = await requireUser(["owner", "admin"]);
  const pelangganId = String(formData.get("pelangganId") ?? "");
  if (!pelangganId) {
    redirect("/dashboard/tagihan?error=" + encodeURIComponent("Pelanggan tidak valid."));
  }

  let converted = 0;
  try {
    ({ converted } = await catatNunggakPelanggan(user.tenantId!, pelangganId));
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Gagal mencatat nunggak.";
    redirect(`/dashboard/tagihan/${pelangganId}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/dashboard/tagihan");
  revalidatePath(`/dashboard/tagihan/${pelangganId}`);
  revalidatePath("/dashboard/pelanggan");
  revalidatePath("/dashboard");
  const msg =
    converted > 0
      ? `Nunggak dicatat (${converted} periode). Pelanggan diaktifkan, jatuh tempo diperbarui.`
      : "Pelanggan diaktifkan kembali.";
  redirect(`/dashboard/tagihan/${pelangganId}?msg=${encodeURIComponent(msg)}`);
}

export async function payTagihanPortalAction(formData: FormData) {
  const cust = await requirePelanggan();
  const selection = parseSelection(String(formData.get("selection") ?? "bulan_ini"));
  const metode = String(formData.get("metode") ?? "QRIS");
  const idempotencyKey = (String(formData.get("idempotencyKey") ?? "").trim() || crypto.randomUUID());

  const summary = await getTagihanSummary(cust.tenantId, cust.id);
  const payable = resolvePayableTagihan(summary, selection);
  if (payable.length === 0) {
    redirect(`/portal/tagihan?error=${encodeURIComponent("Tidak ada tagihan yang dapat dibayar.")}`);
  }
  const total = resolvePayableBalance(payable);

  if (process.env.DUITKU_DRIVER === "real") {
    if (!(await tenantHasSaasFeature(cust.tenantId, "payment_gateway"))) {
      redirect(
        `/portal/tagihan?error=${encodeURIComponent(
          "Pembayaran online tidak tersedia di paket langganan ISP ini."
        )}`
      );
    }
    if (!(await isTenantDuitkuConfigured(cust.tenantId))) {
      redirect(
        `/portal/tagihan?error=${encodeURIComponent(
          "Pembayaran online belum tersedia. ISP belum mengaktifkan payment gateway."
        )}`
      );
    }
    const logId = newId("pgl");
    const orderId = `PAY-${logId}`;
    await db.insert(paymentGatewayLogs).values({
      id: logId,
      tenantId: cust.tenantId,
      referenceType: "invoice",
      referenceId: JSON.stringify({
        kind: "tagihan_pay",
        pelangganId: cust.id,
        selection,
        idempotencyKey,
      }),
      duitkuOrderId: orderId,
      status: "pending",
      amount: total,
    });
    const duitku = getDuitkuClient();
    const trx = await duitku.createTransaction({
      orderId,
      amount: total,
      productName: `Tagihan ${payable.map((t) => t.periode).join(", ")}`,
      customerName: cust.nama,
      customerPhone: cust.noWa,
      tenantId: cust.tenantId,
    });
    redirect(trx.paymentUrl);
  }

  try {
    const result = await payTagihan({
      tenantId: cust.tenantId,
      pelangganId: cust.id,
      selection,
      metode,
      idempotencyKey,
    });
    revalidatePath("/portal/tagihan");
    revalidatePath("/portal");
    redirect(`/portal/nota/${result.receiptId}?success=1`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Pembayaran gagal.";
    redirect(`/portal/tagihan?error=${encodeURIComponent(msg)}`);
  }
}
