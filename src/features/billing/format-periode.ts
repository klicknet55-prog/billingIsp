import { formatBillingPeriod } from "@/lib/utils";

/** YYYY-MM → contoh: Juni 2026 */
export function formatTagihanPeriode(periode: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periode);
  if (!match) return periode;
  return formatBillingPeriod(new Date(Number(match[1]), Number(match[2]) - 1, 1));
}
