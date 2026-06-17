"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSession } from "@/lib/auth/session";
import type { ActionState } from "@/features/auth/actions";
import { parseForm } from "@/lib/validation";
import {
  createSaasPackage,
  deleteSaasPackage,
  registerTenant,
  setTenantStatus,
  updateSaasPackage,
} from "./service";

export async function registerTenantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await registerTenant({
    namaUsaha: String(formData.get("namaUsaha") ?? ""),
    domain: String(formData.get("domain") ?? ""),
    adminNama: String(formData.get("adminNama") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    packageId: String(formData.get("packageId") ?? ""),
  });
  if ("error" in result) return { error: result.error };
  if ("checkoutUrl" in result) {
    redirect(result.checkoutUrl);
  }

  await createSession({
    subjectType: "user",
    subjectId: result.owner.id,
    tenantId: result.tenant.id,
  });
  redirect("/isp");
}

export async function setTenantStatusAction(formData: FormData) {
  await requireUser(["superadmin"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "active" | "suspended";
  await setTenantStatus(id, status);
  revalidatePath("/superadmin/tenants");
}

const saasPackageSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  hargaBulanan: z.coerce.number().int().min(0, "Harga tidak valid"),
  maxPelanggan: z.coerce.number().int().min(1, "Minimal 1"),
  maxRouter: z.coerce.number().int().min(1, "Minimal 1"),
  fitur: z.string().optional().default(""),
  isActive: z.string().optional(),
});

function toFitur(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

export async function saveSaasPackageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);
  const parsed = parseForm(saasPackageSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const id = String(formData.get("id") ?? "");
  const input = {
    nama: parsed.data.nama,
    hargaBulanan: parsed.data.hargaBulanan,
    maxPelanggan: parsed.data.maxPelanggan,
    maxRouter: parsed.data.maxRouter,
    fitur: toFitur(parsed.data.fitur),
    isActive: parsed.data.isActive === "on",
  };
  if (id) await updateSaasPackage(id, input);
  else await createSaasPackage(input);
  revalidatePath("/superadmin/packages");
  return { ok: true };
}

export async function deleteSaasPackageAction(formData: FormData) {
  await requireUser(["superadmin"]);
  await deleteSaasPackage(String(formData.get("id") ?? ""));
  revalidatePath("/superadmin/packages");
}
