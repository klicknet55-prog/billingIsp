import type { tagihan } from "@/lib/db/schema";

export type TagihanRow = typeof tagihan.$inferSelect;

export const OUTSTANDING_TAGIHAN_STATUSES = ["open", "tunggakan", "partial"] as const;

export function tagihanAmountPaid(t: { amountPaid?: number | null }) {
  return t.amountPaid ?? 0;
}

/** Sisa tagihan yang belum dibayar. */
export function tagihanBalance(t: { amount: number; amountPaid?: number | null }) {
  return Math.max(0, t.amount - tagihanAmountPaid(t));
}

export function isTagihanFullyPaid(t: { amount: number; amountPaid?: number | null; status: string }) {
  return t.status === "paid" || tagihanBalance(t) <= 0;
}

export function resolveTagihanStatusAfterPayment(
  t: { amount: number; amountPaid: number },
  wasTunggakan: boolean
): "paid" | "partial" | "tunggakan" | "open" {
  if (t.amountPaid >= t.amount) return "paid";
  if (t.amountPaid > 0) return "partial";
  return wasTunggakan ? "tunggakan" : "open";
}
