"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createInvoice, markInvoicePaid } from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

export async function createInvoiceAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const tgl = String(formData.get("tglJatuhTempo") ?? "");
  await createInvoice(
    user.tenantId!,
    {
      pelangganId: String(formData.get("pelangganId") ?? ""),
      totalTagihan: Number(formData.get("totalTagihan") ?? 0),
      tglJatuhTempo: tgl ? new Date(tgl) : null,
    },
    user.id
  );
  revalidatePath("/isp/invoice");
}

export async function markPaidAction(formData: FormData) {
  const user = await requireUser(["owner", "admin", "kolektor"]);
  const id = String(formData.get("id") ?? "");
  const metode = String(formData.get("metode") ?? "Tunai");
  await markInvoicePaid(user.tenantId!, id, metode);
  revalidatePath("/isp/invoice");
  revalidatePath("/kolektor");
}
