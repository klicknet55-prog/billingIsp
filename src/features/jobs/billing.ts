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

export const REMINDER_DAYS = Number(process.env.BILLING_REMINDER_DAYS ?? 3);
export const GENERATE_DAYS = Number(process.env.BILLING_GENERATE_DAYS ?? 5);
export const FIRST_INVOICE_DAYS = Number(process.env.BILLING_FIRST_INVOICE_DAYS ?? 5);
/** Grace sebelum isolir Mikrotik (H+N setelah jatuh tempo). */
export const ISOLATION_DAYS = Number(process.env.BILLING_ISOLATION_DAYS ?? 7);
/** Dunning step 2 — pengingat setelah lewat jatuh tempo. */
export const DUNNING_STEP2_DAYS = Number(process.env.BILLING_DUNNING_STEP2_DAYS ?? 3);

/** @deprecated Pakai `nextDueDateFromBillingDay`. */
export function nextDueDateFromDay(dueDay: number, now: Date): Date {
  return nextDueDateFromBillingDay(dueDay, now);
}

/** Mulai jendela generate invoice (H-N sebelum jatuh tempo). */
export function invoiceGenerateWindowStart(dueDate: Date): Date {
  return new Date(startOfDay(dueDate).getTime() - GENERATE_DAYS * DAY);
}

/** Sudah masuk jendela generate dan belum lewat jatuh tempo. */
export function shouldGenerateInvoice(now: Date, dueDate: Date): boolean {
  const today = startOfDay(now);
  const due = startOfDay(dueDate);
  const windowStart = invoiceGenerateWindowStart(due);
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
