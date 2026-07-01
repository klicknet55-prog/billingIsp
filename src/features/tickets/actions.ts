"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { assignTicket, createTicket, updateTicketStatus, updateTeknisiLocation } from "./service";

const ISP_ROLES = ["owner", "admin", "teknisi"] as const;

export async function createTicketAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const fromTambah = String(formData.get("fromPage") ?? "") === "tambah";
  const listPath = "/dashboard/tiket";
  const formPath = fromTambah ? "/dashboard/tiket/tambah" : listPath;

  try {
    await createTicket(user.tenantId!, {
      pelangganId: String(formData.get("pelangganId") ?? ""),
      judul: String(formData.get("judul") ?? "").trim(),
      deskripsi: String(formData.get("deskripsi") ?? "") || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat tiket.";
    redirect(`${formPath}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath(listPath);
  redirect(`${listPath}?success=${encodeURIComponent("Tiket berhasil dibuat.")}`);
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
