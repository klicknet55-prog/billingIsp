"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { kapasitasFromSplitterPasif } from "./utils";
import { createOdp, deleteOdp, updateOdp } from "./service";

const ISP_ROLES = ["owner", "admin", "teknisi"] as const;

function numOrNull(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function odpFromForm(formData: FormData) {
  const splitterPasif = String(formData.get("splitterPasif") ?? "").trim() || null;
  const kapasitasRaw = numOrNull(formData.get("kapasitasPort"));
  const autoKap = kapasitasFromSplitterPasif(splitterPasif);
  const sourceType = String(formData.get("inputSourceType") ?? "").trim();
  const sourceId = String(formData.get("inputSourceId") ?? "").trim() || null;

  return {
    kode: String(formData.get("kode") ?? "").trim(),
    nama: String(formData.get("nama") ?? "").trim() || null,
    latitude: numOrNull(formData.get("latitude")),
    longitude: numOrNull(formData.get("longitude")),
    splitterRasio: String(formData.get("splitterRasio") ?? "").trim() || null,
    redamanInputDb: numOrNull(formData.get("redamanInputDb")),
    redamanOutputDb: numOrNull(formData.get("redamanOutputDb")),
    splitterPasif,
    kapasitasPort: kapasitasRaw ?? autoKap ?? 8,
    inputRouterId: sourceType === "router" ? sourceId : null,
    inputOdpId: sourceType === "odp" ? sourceId : null,
    catatan: String(formData.get("catatan") ?? "").trim() || null,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
}

export async function createOdpAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  try {
    await createOdp(user.tenantId!, odpFromForm(formData));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menambah ODP.";
    redirect(`/isp/peta?error=${encodeURIComponent(msg)}&tab=odp`);
  }
  revalidatePath("/isp/peta");
}

export async function updateOdpAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`/isp/peta?error=${encodeURIComponent("ID ODP tidak valid.")}&tab=odp`);

  try {
    await updateOdp(user.tenantId!, id, odpFromForm(formData));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui ODP.";
    redirect(`/isp/peta?error=${encodeURIComponent(msg)}&tab=odp`);
  }
  revalidatePath("/isp/peta");
}

export async function deleteOdpAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  try {
    await deleteOdp(user.tenantId!, id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus ODP.";
    redirect(`/isp/peta?error=${encodeURIComponent(msg)}&tab=odp`);
  }
  revalidatePath("/isp/peta");
}
