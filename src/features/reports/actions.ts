"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { addPengeluaran } from "./service";

export async function addPengeluaranAction(formData: FormData) {
  const user = await requireUser(["owner", "admin"]);
  await addPengeluaran(user.tenantId!, {
    kategoriId: String(formData.get("kategoriId") ?? "") || null,
    jumlah: Number(formData.get("jumlah") ?? 0),
    catatan: String(formData.get("catatan") ?? "") || null,
  });
  revalidatePath("/isp/laporan");
}
