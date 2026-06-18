"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { parseForm } from "@/lib/validation";
import { createRouter, deleteRouter, refreshRouterStatus, updateRouter } from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

const routerSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  connectionMode: z.enum(["rest", "legacy_api"]),
  ipAddress: z.string().trim().min(1, "IP address wajib diisi"),
  apiPort: z.string().trim().min(1, "Port wajib diisi"),
  username: z.string().trim().min(1, "Username wajib diisi"),
  password: z.string().optional(),
  tipe: z.enum(["pppoe", "hotspot"]),
});

export async function createRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  try {
    await createRouter(user.tenantId!, {
      nama: String(formData.get("nama") ?? "").trim(),
      connectionMode: (String(formData.get("connectionMode") ?? "rest") as
        | "rest"
        | "legacy_api"),
      ipAddress: String(formData.get("ipAddress") ?? "").trim(),
      apiPort: String(formData.get("apiPort") ?? "443").trim(),
      username: String(formData.get("username") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      tipe: (String(formData.get("tipe") ?? "pppoe") as "pppoe" | "hotspot"),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menambah router.";
    redirect(`/isp/router?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/isp/router");
}

export async function updateRouterAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(ISP_ROLES);
  const parsed = parseForm(routerSchema, formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID router tidak valid." };

  try {
    await updateRouter(user.tenantId!, id, {
      nama: parsed.data.nama,
      connectionMode: parsed.data.connectionMode,
      ipAddress: parsed.data.ipAddress,
      apiPort: parsed.data.apiPort,
      username: parsed.data.username,
      tipe: parsed.data.tipe,
      password: parsed.data.password,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal memperbarui router." };
  }

  revalidatePath("/isp/router");
  return { ok: true };
}

export async function deleteRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  try {
    await deleteRouter(user.tenantId!, id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus router.";
    redirect(`/isp/router?error=${encodeURIComponent(msg)}&routerId=${encodeURIComponent(id)}`);
  }
  revalidatePath("/isp/router");
}

export async function refreshRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const result = await refreshRouterStatus(user.tenantId!, String(formData.get("id") ?? ""));
  if (result.error) {
    redirect(`/isp/router?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/isp/router");
}
