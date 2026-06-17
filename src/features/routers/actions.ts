"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createRouter, deleteRouter, refreshRouterStatus } from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

export async function createRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  try {
    await createRouter(user.tenantId!, {
      nama: String(formData.get("nama") ?? "").trim(),
      ipAddress: String(formData.get("ipAddress") ?? "").trim(),
      apiPort: String(formData.get("apiPort") ?? "8728").trim(),
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

export async function deleteRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  await deleteRouter(user.tenantId!, String(formData.get("id") ?? ""));
  revalidatePath("/isp/router");
}

export async function refreshRouterAction(formData: FormData) {
  const user = await requireUser(ISP_ROLES);
  await refreshRouterStatus(user.tenantId!, String(formData.get("id") ?? ""));
  revalidatePath("/isp/router");
}
