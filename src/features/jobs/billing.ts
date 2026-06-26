import "server-only";
import { createPortalMagicLink } from "@/lib/auth/portal-link";
import { formatDate, formatRupiah } from "@/lib/utils";

const DAY = 24 * 60 * 60 * 1000;

export const REMINDER_DAYS = Number(process.env.BILLING_REMINDER_DAYS ?? 3);
export const GENERATE_DAYS = Number(process.env.BILLING_GENERATE_DAYS ?? 5);
export const FIRST_INVOICE_DAYS = Number(process.env.BILLING_FIRST_INVOICE_DAYS ?? 5);

/** Normalisasi ke tengah malam (timezone server). */
export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Tambah bulan dengan aman (clamp hari jika bulan target lebih pendek). */
export function addMonths(value: Date, months: number): Date {
  const d = new Date(value);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** Tanggal jatuh tempo berikutnya dari hari-tanggal (1–31) relatif ke `now`. */
export function nextDueDateFromDay(dueDay: number, now: Date): Date {
  const today = startOfDay(now);
  let due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  }
  return due;
}

/** Apakah dua tanggal jatuh tempo di periode tagihan yang sama (bulan + tahun). */
export function sameBillingPeriod(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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

/** URL portal tagihan fallback (tanpa auto-login). */
export function portalTagihanUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}/portal/tagihan` : "/portal/tagihan";
}

/** Link bayar dengan auto-login portal untuk pelanggan. */
export function portalPayLink(tenantId: string, pelangganId: string): string {
  try {
    return createPortalMagicLink(tenantId, pelangganId, "/portal/tagihan");
  } catch {
    return portalTagihanUrl();
  }
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
