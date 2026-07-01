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
});

export async function createRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const fromTambah = String(formData.get("fromPage") ?? "") === "tambah";
  const listPath = "/dashboard/router";
  const formPath = fromTambah ? "/dashboard/router/tambah" : listPath;

  const nama = String(formData.get("nama") ?? "").trim();
  const input = {
    nama,
    connectionMode: (String(formData.get("connectionMode") ?? "rest") as "rest" | "legacy_api"),
    ipAddress: String(formData.get("ipAddress") ?? "").trim(),
    apiPort: String(formData.get("apiPort") ?? "443").trim(),
    username: String(formData.get("username") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };

  let id: string;
  try {
    id = await createRouter(user.tenantId!, input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menambah router.";
    redirect(`${formPath}?error=${encodeURIComponent(msg)}`);
  }

  let status;
  try {
    status = await refreshRouterStatus(user.tenantId!, id);
  } catch (err) {
    revalidatePath(listPath);
    const detail = err instanceof Error ? err.message : "";
    redirect(
      `${listPath}?warn=${encodeURIComponent(`Router "${nama}" tersimpan, tetapi cek status gagal.${detail ? ` ${detail}` : ""}`)}`
    );
  }

  revalidatePath(listPath);
  if (status.online) {
    redirect(
      `${listPath}?success=${encodeURIComponent(status.message ?? `Router "${nama}" tersimpan dan terhubung.`)}`
    );
  }
  redirect(
    `${listPath}?warn=${encodeURIComponent(`Router "${nama}" tersimpan, tetapi belum terhubung. ${status.error ?? ""}`)}`
  );
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
      password: parsed.data.password,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal memperbarui router." };
  }

  revalidatePath("/dashboard/router");
  return { ok: true };
}

export async function deleteRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  try {
    await deleteRouter(user.tenantId!, id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus router.";
    redirect(`/dashboard/router?error=${encodeURIComponent(msg)}&routerId=${encodeURIComponent(id)}`);
  }
  revalidatePath("/dashboard/router");
}

export async function refreshRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  const id = String(formData.get("id") ?? "");
  const result = await refreshRouterStatus(user.tenantId!, id);
  revalidatePath("/dashboard/router");
  if (result.online) {
    redirect(`/dashboard/router?success=${encodeURIComponent(result.message ?? "Router terhubung.")}`);
  }
  redirect(`/dashboard/router?error=${encodeURIComponent(result.error ?? "Router tidak dapat dijangkau.")}`);
}
