import "server-only";
import { createPortalPayLink } from "@/lib/auth/portal-access-code";
import {
  addMonths,
  nextDueDateFromBillingDay,
  sameBillingPeriod,
  startOfDay,
} from "@/features/jobs/due-date";
import { formatDate, formatRupiah } from "@/lib/utils";

export { addMonths, sameBillingPeriod, startOfDay };

/** URL portal tagihan fallback (tanpa auto-login). */
export function portalTagihanUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}/portal/tagihan` : "/portal/tagihan";
}

/** Link bayar dengan auto-login portal (kode pendek di database). */
export async function portalPayLink(tenantId: string, pelangganId: string): Promise<string> {
  try {
    return await createPortalPayLink(tenantId, pelangganId, "/portal/tagihan");
  } catch {
    return portalTagihanUrl();
  }
}

const DAY = 24 * 60 * 60 * 1000;

export interface BillingSettings {
  reminderDays: number;
  firstInvoiceDays: number;
  generateDays: number;
  isolationDays: number;
  dunningStep2Days: number;
}

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  reminderDays: 3,
  firstInvoiceDays: 5,
  generateDays: 5,
  isolationDays: 7,
  dunningStep2Days: 3,
};

/** @deprecated Pakai `nextDueDateFromBillingDay`. */
export function nextDueDateFromDay(dueDay: number, now: Date): Date {
  return nextDueDateFromBillingDay(dueDay, now);
}

/** Mulai jendela generate invoice (H-N sebelum jatuh tempo). */
export function invoiceGenerateWindowStart(
  dueDate: Date,
  generateDays = DEFAULT_BILLING_SETTINGS.generateDays
): Date {
  return new Date(startOfDay(dueDate).getTime() - generateDays * DAY);
}

/** Sudah masuk jendela generate dan belum lewat jatuh tempo. */
export function shouldGenerateInvoice(
  now: Date,
  dueDate: Date,
  generateDays = DEFAULT_BILLING_SETTINGS.generateDays
): boolean {
  const today = startOfDay(now);
  const due = startOfDay(dueDate);
  const windowStart = invoiceGenerateWindowStart(due, generateDays);
  return today >= windowStart && today <= due;
}

export function formatInvoiceMessage(parts: {
  noInvoice: string;
  amount: number;
  dueDate: Date;
  kind: "new" | "pre_due" | "overdue";
  payUrl: string;
}): string {
  const amount = formatRupiah(parts.amount);
  const due = formatDate(parts.dueDate);

  switch (parts.kind) {
    case "new":
      return `Tagihan ${parts.noInvoice} sebesar ${amount} jatuh tempo ${due}. Bayar: ${parts.payUrl}`;
    case "pre_due":
      return `Pengingat: tagihan ${parts.noInvoice} (${amount}) jatuh tempo ${due}. Bayar: ${parts.payUrl}`;
    case "overdue":
      return `Tagihan ${parts.noInvoice} (${amount}) telah jatuh tempo. Layanan dinonaktifkan sementara. Bayar: ${parts.payUrl}`;
  }
}
