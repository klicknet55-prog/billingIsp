"use server";

import { revalidatePath } from "next/cache";
import { requirePelanggan } from "@/lib/auth";
import { submitComplaint } from "@/features/portal/complaint-service";

export async function createComplaintAction(formData: FormData) {
  const cust = await requirePelanggan();
  const fotoFile = formData.get("foto");
  await submitComplaint({
    tenantId: cust.tenantId,
    pelangganId: cust.id,
    judul: String(formData.get("judul") ?? ""),
    deskripsi: String(formData.get("deskripsi") ?? "") || null,
    fotoFile: fotoFile instanceof File && fotoFile.size > 0 ? fotoFile : null,
  });
  revalidatePath("/portal/lapor");
}
