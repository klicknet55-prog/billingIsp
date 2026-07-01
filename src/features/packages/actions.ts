"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { parseForm } from "@/lib/validation";
import { listMikrotikProfiles } from "@/features/routers/service";
import { createPaket, deletePaket, updatePaket, type PaketInput } from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

const paketSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  kecepatan: z.string().trim().min(1, "Kecepatan wajib diisi"),
  tipe: z.enum(["pppoe", "hotspot"]),
  routerId: z.string().optional(),
  mikrotikProfilePppoe: z.string().optional(),
  mikrotikProfileHotspot: z.string().optional(),
  hargaBulanan: z.coerce.number().min(0, "Harga tidak valid"),
});

function paketFromForm(formData: FormData): PaketInput {
  const tipe: "pppoe" | "hotspot" =
    String(formData.get("tipe") ?? "pppoe") === "hotspot" ? "hotspot" : "pppoe";
  return {
    nama: String(formData.get("nama") ?? "").trim(),
    kecepatan: String(formData.get("kecepatan") ?? "").trim(),
    tipe,
    routerId: String(formData.get("routerId") ?? "").trim() || null,
    mikrotikProfilePppoe: String(formData.get("mikrotikProfilePppoe") ?? "").trim() || null,
    mikrotikProfileHotspot: String(formData.get("mikrotikProfileHotspot") ?? "").trim() || null,
    hargaBulanan: Number(formData.get("hargaBulanan") ?? 0),
  };
}

export async function fetchMikrotikProfilesAction(routerId: string, type: "pppoe" | "hotspot") {
  const user = await requireUser(ISP_ROLES);
  if (!routerId.trim()) return { error: "Pilih router terlebih dahulu." };
  try {
    const profiles = await listMikrotikProfiles(user.tenantId!, routerId, type);
    return { profiles };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal memuat profile dari router." };
  }
}

export async function createPaketAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const fromTambah = String(formData.get("fromPage") ?? "") === "tambah";
  const listPath = "/dashboard/paket";
  const formPath = fromTambah ? "/dashboard/paket/tambah" : listPath;

  try {
    await createPaket(user.tenantId!, paketFromForm(formData));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menambah paket.";
    redirect(`${formPath}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath(listPath);
  redirect(`${listPath}?success=${encodeURIComponent("Paket berhasil ditambahkan.")}`);
}

export async function updatePaketAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(ISP_ROLES);
  const parsed = parseForm(paketSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID paket tidak valid." };

  try {
    await updatePaket(user.tenantId!, id, {
      nama: parsed.data.nama,
      kecepatan: parsed.data.kecepatan,
      tipe: parsed.data.tipe,
      routerId: parsed.data.routerId?.trim() || null,
      mikrotikProfilePppoe: parsed.data.mikrotikProfilePppoe?.trim() || null,
      mikrotikProfileHotspot: parsed.data.mikrotikProfileHotspot?.trim() || null,
      hargaBulanan: parsed.data.hargaBulanan,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal memperbarui paket." };
  }

  revalidatePath("/dashboard/paket");
  return { ok: true };
}

export async function deletePaketAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  await deletePaket(user.tenantId!, String(formData.get("id") ?? ""));
  revalidatePath("/dashboard/paket");
}
