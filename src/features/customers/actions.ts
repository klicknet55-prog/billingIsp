"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/auth/otp";
import { parseLocalDate } from "@/features/jobs/due-date";
import {
  createPelanggan,
  deletePelangganRecords,
  removePelangganFromMikrotik,
  setIsolasi,
  updatePelanggan,
  type DeletePelangganStats,
  type DeletePelangganStepResult,
  type PelangganInput,
} from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

function num(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return v === null || v === "" || Number.isNaN(n) ? null : n;
}

function parseInput(formData: FormData): PelangganInput {
  const tgl = String(formData.get("tglJatuhTempo") ?? "");
  const tglDaftarRaw = String(formData.get("tglDaftar") ?? "");
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
    odpId: String(formData.get("odpId") ?? "") || null,
    odpPort: String(formData.get("odpPort") ?? "").trim() || null,
    tglDaftar: tglDaftarRaw ? (parseLocalDate(tglDaftarRaw) ?? new Date()) : new Date(),
    tglJatuhTempo: tgl ? parseLocalDate(tgl) : null,
  };
}

export async function createPelangganAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  let result: Awaited<ReturnType<typeof createPelanggan>>;
  try {
    result = await createPelanggan(user.tenantId!, parseInput(formData), user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menambah pelanggan.";
    redirect(`/isp/pelanggan?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/isp/pelanggan");
  if (result.mikrotikWarning) {
    redirect(`/isp/pelanggan?warn=${encodeURIComponent(result.mikrotikWarning)}`);
  }
  redirect(`/isp/pelanggan?success=${encodeURIComponent("Pelanggan berhasil ditambahkan.")}`);
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

export async function deletePelangganCompleteAction(id: string): Promise<{
  mikrotik: DeletePelangganStepResult;
  records: { ok: true; stats: DeletePelangganStats } | { ok: false; message: string };
}> {
  const user = await requireUser(ISP_ROLES);
  const tenantId = user.tenantId!;
  let mikrotik: DeletePelangganStepResult;
  try {
    mikrotik = await removePelangganFromMikrotik(tenantId, id);
  } catch (err) {
    mikrotik = {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal menghapus user di Mikrotik.",
    };
  }
  try {
    const stats = await deletePelangganRecords(tenantId, id);
    revalidatePath("/isp/pelanggan");
    revalidatePath("/isp/invoice");
    revalidatePath("/isp/tiket");
    return { mikrotik, records: { ok: true, stats } };
  } catch (err) {
    return {
      mikrotik,
      records: {
        ok: false,
        message: err instanceof Error ? err.message : "Gagal menghapus data pelanggan.",
      },
    };
  }
}

export async function removePelangganMikrotikAction(
  id: string
): Promise<DeletePelangganStepResult> {
  const user = await requireUser(ISP_ROLES);
  return removePelangganFromMikrotik(user.tenantId!, id);
}

export async function deletePelangganRecordsAction(
  id: string
): Promise<{ ok: true; stats: DeletePelangganStats } | { ok: false; message: string }> {
  const user = await requireUser(ISP_ROLES);
  try {
    const stats = await deletePelangganRecords(user.tenantId!, id);
    revalidatePath("/isp/pelanggan");
    revalidatePath("/isp/invoice");
    revalidatePath("/isp/tiket");
    return { ok: true, stats };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal menghapus data pelanggan.",
    };
  }
}

export async function toggleIsolasiAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  const isolated = String(formData.get("isolated") ?? "") === "true";
  await setIsolasi(user.tenantId!, id, isolated);
  revalidatePath("/isp/pelanggan");
}
