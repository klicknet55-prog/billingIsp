"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { assignTicket, createTicket, updateTicketStatus, updateTeknisiLocation } from "./service";

const ISP_ROLES = ["owner", "admin", "teknisi"] as const;

export async function createTicketAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  await createTicket(user.tenantId!, {
    pelangganId: String(formData.get("pelangganId") ?? ""),
    judul: String(formData.get("judul") ?? "").trim(),
    deskripsi: String(formData.get("deskripsi") ?? "") || null,
  });
  revalidatePath("/dashboard/tiket");
}

export async function updateTicketStatusAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  await updateTicketStatus(
    user.tenantId!,
    String(formData.get("id") ?? ""),
    String(formData.get("status") ?? "open") as "open" | "in_progress" | "resolved"
  );
  revalidatePath("/dashboard/tiket");
}

export async function assignTicketAction(formData: FormData) {
  await requireUser(ISP_ROLES);
  await assignTicket(String(formData.get("ticketId") ?? ""), String(formData.get("userId") ?? ""));
  revalidatePath("/dashboard/tiket");
}

export async function updateTeknisiLocationAction(formData: FormData) {
  const user = await requireUser(["teknisi"]);
  const lat = Number(formData.get("latitude"));
  const lng = Number(formData.get("longitude"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  await updateTeknisiLocation(user.tenantId!, user.id, lat, lng);
}
