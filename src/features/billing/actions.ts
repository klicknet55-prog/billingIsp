"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { payTagihan } from "@/features/billing/payment-service";
import {
  catatNunggakPelanggan,
  getTagihanSummary,
  resolvePayableTagihan,
  type PaymentSelection,
} from "@/features/billing/tagihan-service";
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
    revalidatePath("/isp/tagihan");
    revalidatePath("/isp/invoice");
    revalidatePath("/isp/pelanggan");
    revalidatePath("/kolektor");
    revalidatePath("/portal/tagihan");
    redirect(`/isp/nota/${result.receiptId}?success=1`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Pembayaran gagal.";
    redirect(`/isp/tagihan/${pelangganId}?error=${encodeURIComponent(msg)}`);
  }
}

export async function catatNunggakAction(formData: FormData) {
  const user = await requireUser(["owner", "admin"]);
  const pelangganId = String(formData.get("pelangganId") ?? "");
  if (!pelangganId) {
    redirect("/isp/tagihan?error=" + encodeURIComponent("Pelanggan tidak valid."));
  }

  let converted = 0;
  try {
    ({ converted } = await catatNunggakPelanggan(user.tenantId!, pelangganId));
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Gagal mencatat nunggak.";
    redirect(`/isp/tagihan/${pelangganId}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/isp/tagihan");
  revalidatePath(`/isp/tagihan/${pelangganId}`);
  revalidatePath("/isp/pelanggan");
  revalidatePath("/isp");
  const msg =
    converted > 0
      ? `Nunggak dicatat (${converted} periode). Pelanggan diaktifkan, jatuh tempo diperbarui.`
      : "Pelanggan diaktifkan kembali.";
  redirect(`/isp/tagihan/${pelangganId}?msg=${encodeURIComponent(msg)}`);
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
  const total = payable.reduce((s, t) => s + t.amount, 0);

  if (process.env.DUITKU_DRIVER === "real") {
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
