"use server";

import { revalidatePath } from "next/cache";
import { requirePelanggan } from "@/lib/auth";
import { createTicket } from "@/features/tickets/service";
import { savePublicUpload } from "@/lib/uploads";

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
