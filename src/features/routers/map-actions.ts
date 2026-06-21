"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { clearRouterLocation, updateRouterLocation } from "./service";

const MAP_ROLES = ["owner", "admin", "teknisi"] as const;

function numOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function updateRouterLocationAction(formData: FormData) {
  const user = await requireUser(MAP_ROLES);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`/isp/peta?error=${encodeURIComponent("Router tidak valid.")}&tab=router`);

  try {
    await updateRouterLocation(
      user.tenantId!,
      id,
      numOrNull(formData.get("latitude")),
      numOrNull(formData.get("longitude"))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan lokasi router.";
    redirect(`/isp/peta?error=${encodeURIComponent(msg)}&tab=router`);
  }
  revalidatePath("/isp/peta");
}

export async function clearRouterLocationAction(formData: FormData) {
  const user = await requireUser(MAP_ROLES);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`/isp/peta?error=${encodeURIComponent("Router tidak valid.")}&tab=router`);

  try {
    await clearRouterLocation(user.tenantId!, id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus lokasi router.";
    redirect(`/isp/peta?error=${encodeURIComponent(msg)}&tab=router`);
  }
  revalidatePath("/isp/peta");
}
