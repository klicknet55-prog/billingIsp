"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { MIN_DONATION_AMOUNT } from "@/lib/donation/constants";
import {
  createFreePackageRenewal,
  isPlatformDonationConfigured,
} from "./service";

function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

const renewalSchema = z.object({
  amount: z.coerce
    .number()
    .int("Nominal harus bilangan bulat.")
    .min(
      MIN_DONATION_AMOUNT,
      `Minimal Rp ${MIN_DONATION_AMOUNT.toLocaleString("id-ID")}`
    ),
});

export async function createFreeRenewalDonationAction(formData: FormData) {
  const user = await requireUser(["owner", "admin"], { allowRenewalOnly: true });
  const tenantId = user.tenantId;
  if (!tenantId) redirect("/login");

  if (!isPlatformDonationConfigured()) {
    redirect(
      `/dashboard/langganan?error=${encodeURIComponent("Pembayaran donasi belum dikonfigurasi di server platform.")}`
    );
  }

  const parsed = renewalSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Nominal donasi tidak valid.";
    redirect(`/dashboard/langganan?error=${encodeURIComponent(msg)}`);
  }

  try {
    const result = await createFreePackageRenewal({
      tenantId,
      userId: user.id,
      userName: user.nama,
      amount: parsed.data.amount,
      returnTo: "/dashboard/langganan",
    });
    if ("paymentUrl" in result) redirect(result.paymentUrl);
    revalidatePath("/dashboard/langganan");
    revalidatePath("/dashboard", "layout");
    redirect("/dashboard/langganan?ok=1");
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Gagal membuat donasi perpanjang.";
    redirect(`/dashboard/langganan?error=${encodeURIComponent(msg)}`);
  }
}
