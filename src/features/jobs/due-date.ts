import "server-only";

const MAX_BILLING_DAY = 28;

/** Normalisasi ke tengah malam (timezone server). */
export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Parse input date HTML (YYYY-MM-DD) sebagai tanggal lokal, bukan UTC midnight. */
export function parseLocalDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPastDue(dueDate: Date, now: Date = new Date()): boolean {
  return startOfDay(now) > startOfDay(dueDate);
}

/** Hari tagihan bulanan (clamp 28 agar aman di Februari). */
export function billingDayOfMonth(date: Date): number {
  return Math.min(date.getDate(), MAX_BILLING_DAY);
}

/** Tanggal jatuh tempo pertama dari tanggal pendaftaran. */
export function computeInitialDueDate(tglDaftar: Date): Date {
  const day = billingDayOfMonth(tglDaftar);
  const today = startOfDay(new Date());
  let due = new Date(tglDaftar.getFullYear(), tglDaftar.getMonth(), day);
  if (startOfDay(due) < today) {
    due = new Date(tglDaftar.getFullYear(), tglDaftar.getMonth() + 1, day);
  }
  return due;
}

/** Periode tagihan YYYY-MM dari tanggal jatuh tempo. */
export function periodKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Tanggal jatuh tempo berikutnya dari hari tagihan relatif ke `from`. */
export function nextDueDateFromBillingDay(billingDay: number, from: Date): Date {
  const day = Math.min(billingDay, MAX_BILLING_DAY);
  const today = startOfDay(from);
  let due = new Date(today.getFullYear(), today.getMonth(), day);
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, day);
  }
  return due;
}

/** Resolve anchor billing day dari pelanggan. */
export function resolveBillingDay(tglDaftar: Date | null, tglJatuhTempo: Date | null): number {
  if (tglJatuhTempo) return billingDayOfMonth(tglJatuhTempo);
  if (tglDaftar) return billingDayOfMonth(tglDaftar);
  return billingDayOfMonth(new Date());
}

/**
 * Periode & jatuh tempo aktif — mengacu ke `tglJatuhTempo` pelanggan (kewajiban saat ini),
 * bukan menghitung ulang "due berikutnya" dari hari ini.
 */
export function resolveActiveBillingPeriod(
  tglDaftar: Date | null,
  tglJatuhTempo: Date | null,
  ref: Date = new Date()
): { periode: string; dueDate: Date; billingDay: number } {
  const billingDay = resolveBillingDay(tglDaftar, tglJatuhTempo);
  let dueDate: Date;

  if (tglJatuhTempo) {
    dueDate = startOfDay(tglJatuhTempo);
  } else if (tglDaftar) {
    dueDate = startOfDay(computeInitialDueDate(tglDaftar));
  } else {
    dueDate = nextDueDateFromBillingDay(billingDay, ref);
  }

  return {
    periode: periodKeyFromDate(dueDate),
    dueDate,
    billingDay,
  };
}

/** Tambah bulan dengan clamp hari. */
export function addMonths(value: Date, months: number): Date {
  const d = new Date(value);
  const day = Math.min(d.getDate(), MAX_BILLING_DAY);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}
