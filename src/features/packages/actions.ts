"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createPaket, deletePaket } from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

export async function createPaketAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  await createPaket(user.tenantId!, {
    nama: String(formData.get("nama") ?? "").trim(),
    kecepatan: String(formData.get("kecepatan") ?? "").trim(),
    hargaBulanan: Number(formData.get("hargaBulanan") ?? 0),
  });
  revalidatePath("/isp/paket");
}

export async function deletePaketAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  await deletePaket(user.tenantId!, String(formData.get("id") ?? ""));
  revalidatePath("/isp/paket");
}
