"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/auth/otp";
import {
  createPelanggan,
  deletePelanggan,
  setIsolasi,
  updatePelanggan,
  type PelangganInput,
} from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

function num(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return v === null || v === "" || Number.isNaN(n) ? null : n;
}

function parseInput(formData: FormData): PelangganInput {
  const tgl = String(formData.get("tglJatuhTempo") ?? "");
  const rawType = String(formData.get("connectionType") ?? "pppoe");
  const connectionType = rawType === "hotspot" ? "hotspot" : "pppoe";
  return {
    nama: String(formData.get("nama") ?? "").trim(),
    noWa: normalizePhone(String(formData.get("noWa") ?? "")),
    connectionType,
    connectionUsername: String(formData.get("connectionUsername") ?? "").trim() || null,
    connectionPassword: String(formData.get("connectionPassword") ?? "").trim() || null,
    alamat: String(formData.get("alamat") ?? "") || null,
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
    ipAddress: String(formData.get("ipAddress") ?? "") || null,
    paketInternetId: String(formData.get("paketInternetId") ?? "") || null,
    routerId: String(formData.get("routerId") ?? "") || null,
    tglJatuhTempo: tgl ? new Date(tgl) : null,
  };
}

export async function createPelangganAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  try {
    await createPelanggan(user.tenantId!, parseInput(formData), user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menambah pelanggan.";
    redirect(`/isp/pelanggan?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/isp/pelanggan");
}

export async function updatePelangganAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  try {
    await updatePelanggan(user.tenantId!, id, parseInput(formData));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui pelanggan.";
    redirect(`/isp/pelanggan/${id}?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/isp/pelanggan");
  redirect("/isp/pelanggan");
}

export async function deletePelangganAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  try {
    await deletePelanggan(user.tenantId!, id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus pelanggan.";
    redirect(`/isp/pelanggan?error=${encodeURIComponent(msg)}&pelangganId=${encodeURIComponent(id)}`);
  }
  revalidatePath("/isp/pelanggan");
}

export async function toggleIsolasiAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  const isolated = String(formData.get("isolated") ?? "") === "true";
  await setIsolasi(user.tenantId!, id, isolated);
  revalidatePath("/isp/pelanggan");
}
