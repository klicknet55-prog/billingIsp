"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/features/auth/actions";
import { createSession } from "@/lib/auth/session";
import { registerTenant } from "./service";

/** Server action khusus form pendaftaran tenant (terpisah dari actions.ts besar). */
export async function registerTenantFormAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (formData.get("acceptTerms") !== "on") {
    return { error: "Anda harus menyetujui Syarat & Ketentuan untuk mendaftar." };
  }

  const result = await registerTenant({
    namaUsaha: String(formData.get("namaUsaha") ?? ""),
    domain: String(formData.get("domain") ?? ""),
    adminNama: String(formData.get("adminNama") ?? ""),
    adminPhone: String(formData.get("adminPhone") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    packageId: String(formData.get("packageId") ?? ""),
    billingPeriod:
      String(formData.get("billingPeriod") ?? "monthly") === "yearly" ? "yearly" : "monthly",
  });

  if ("error" in result) return { error: result.error };
  if ("checkoutUrl" in result) redirect(result.checkoutUrl);

  await createSession({
    subjectType: "user",
    subjectId: result.owner.id,
    tenantId: result.tenant.id,
  });
  redirect("/isp");
}
