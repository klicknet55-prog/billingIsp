"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePelanggan } from "@/lib/auth";
import { getInvoice, markInvoicePaid } from "@/features/invoices/service";
import { createTicket } from "@/features/tickets/service";
import { savePublicUpload } from "@/lib/uploads";
import { getDuitkuClient } from "@/lib/integrations/duitku";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";

/** Pembayaran mandiri pelanggan via Duitku (mock = sukses instan). */
export async function payInvoiceAction(formData: FormData) {
  const cust = await requirePelanggan();
  const invoiceId = String(formData.get("id") ?? "");
  const metode = String(formData.get("metode") ?? "QRIS");

  const inv = await getInvoice(cust.tenantId, invoiceId);
  if (!inv || inv.pelangganId !== cust.id || inv.status === "paid") return;

  const duitku = getDuitkuClient();
  const orderId = `INV-${inv.id}`;
  const trx = await duitku.createTransaction({
    orderId,
    amount: inv.totalTagihan,
    productName: `Tagihan ${inv.noInvoice}`,
    customerName: cust.nama,
    customerPhone: cust.noWa,
    tenantId: cust.tenantId,
  });
  if (process.env.DUITKU_DRIVER === "real") {
    redirect(trx.paymentUrl);
  }
  duitku.simulatePaid(orderId, inv.totalTagihan);

  await markInvoicePaid(cust.tenantId, inv.id, metode);
  await getWhatsAppClient().sendNotification(
    cust.noWa,
    `Pembayaran ${inv.noInvoice} berhasil. Terima kasih.`,
    cust.tenantId
  );
  revalidatePath("/portal");
}

export async function createComplaintAction(formData: FormData) {
  const cust = await requirePelanggan();
  let fotoUrl: string | null = String(formData.get("fotoUrl") ?? "") || null;
  const fotoFile = formData.get("foto");
  if (fotoFile instanceof File && fotoFile.size > 0) {
    try {
      fotoUrl = await savePublicUpload("tickets", fotoFile, { prefix: cust.id });
    } catch (err) {
      throw err instanceof Error ? err : new Error("Gagal mengunggah foto.");
    }
  }
  await createTicket(cust.tenantId, {
    pelangganId: cust.id,
    judul: String(formData.get("judul") ?? "").trim(),
    deskripsi: String(formData.get("deskripsi") ?? "") || null,
    fotoUrl,
  });
  revalidatePath("/portal/lapor");
}
