"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  createCommunityDonation,
  resolveKontributorPath,
} from "./service";
import { MIN_COMMUNITY_DONATION } from "./constants";

function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

const donateSchema = z.object({
  amount: z.coerce
    .number()
    .int("Nominal harus bilangan bulat.")
    .min(MIN_COMMUNITY_DONATION, `Minimal Rp ${MIN_COMMUNITY_DONATION.toLocaleString("id-ID")}`),
  returnTo: z.string().trim().optional(),
});

export async function donateCommunityAction(formData: FormData) {
  const user = await requireUser(["owner", "admin", "kolektor", "teknisi"]);
  const tenantId = user.tenantId;
  if (!tenantId) redirect("/login");

  const parsed = donateSchema.safeParse({
    amount: formData.get("amount"),
    returnTo: formData.get("returnTo"),
  });
  const returnTo = parsed.data?.returnTo?.trim() || "/dashboard/community";

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Nominal donasi tidak valid.";
    redirect(`${returnTo}?donationError=${encodeURIComponent(msg)}`);
  }

  try {
    const kontributorPath = resolveKontributorPath(
      returnTo.includes("/community") ? returnTo.replace(/\/community$/, "/kontributor") : returnTo
    );

    const result = await createCommunityDonation({
      userId: user.id,
      tenantId,
      amount: parsed.data.amount,
      kontributorPath,
    });

    if ("paymentUrl" in result) {
      redirect(result.paymentUrl);
    }

    redirect(`${kontributorPath}?ok=1`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : "Gagal memproses donasi.";
    redirect(`${returnTo}?donationError=${encodeURIComponent(msg)}`);
  }
}
