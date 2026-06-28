import "server-only";

import {
  daysInCalendarMonth,
  getAppTimeZone,
  getZonedParts,
  parseDateOnlyInAppTz,
  startOfDayInAppTz,
  zonedDateTimeToUtc,
} from "@/lib/app-timezone";

const MAX_BILLING_DAY = 28;

/** Normalisasi ke tengah malam di zona waktu app (`APP_TIMEZONE`). */
export function startOfDay(value: Date): Date {
  return startOfDayInAppTz(value);
}

/** Parse input date HTML (YYYY-MM-DD) di zona waktu app, bukan UTC midnight. */
export function parseLocalDate(value: string): Date | null {
  return parseDateOnlyInAppTz(value);
}

export function isPastDue(dueDate: Date, now: Date = new Date()): boolean {
  return startOfDay(now) > startOfDay(dueDate);
}

/** Hari tagihan bulanan (clamp 28 agar aman di Februari). */
export function billingDayOfMonth(date: Date): number {
  return Math.min(getZonedParts(date).day, MAX_BILLING_DAY);
}

/** Tanggal jatuh tempo pertama dari tanggal pendaftaran. */
export function computeInitialDueDate(tglDaftar: Date): Date {
  const tz = getAppTimeZone();
  const day = billingDayOfMonth(tglDaftar);
  const reg = getZonedParts(tglDaftar, tz);
  const today = startOfDay(new Date());
  let due = zonedDateTimeToUtc(reg.year, reg.month, day, 0, 0, 0, tz);
  if (startOfDay(due) < today) {
    let month = reg.month + 1;
    let year = reg.year;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    due = zonedDateTimeToUtc(year, month, day, 0, 0, 0, tz);
  }
  return due;
}

/** Periode tagihan YYYY-MM dari tanggal jatuh tempo (zona app). */
export function periodKeyFromDate(date: Date): string {
  const { year, month } = getZonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Tanggal jatuh tempo berikutnya dari hari tagihan relatif ke `from`. */
export function nextDueDateFromBillingDay(billingDay: number, from: Date): Date {
  const tz = getAppTimeZone();
  const day = Math.min(billingDay, MAX_BILLING_DAY);
  const today = startOfDay(from);
  const parts = getZonedParts(today, tz);
  let due = zonedDateTimeToUtc(parts.year, parts.month, day, 0, 0, 0, tz);
  if (due < today) {
    let month = parts.month + 1;
    let year = parts.year;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    due = zonedDateTimeToUtc(year, month, day, 0, 0, 0, tz);
  }
  return due;
}

/** Apakah dua tanggal jatuh tempo di periode tagihan yang sama (bulan + tahun, zona app). */
export function sameBillingPeriod(a: Date, b: Date): boolean {
  const pa = getZonedParts(a);
  const pb = getZonedParts(b);
  return pa.year === pb.year && pa.month === pb.month;
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

/** Tambah bulan dengan clamp hari (zona app). */
export function addMonths(value: Date, months: number): Date {
  const tz = getAppTimeZone();
  const p = getZonedParts(value, tz);
  const day = Math.min(p.day, MAX_BILLING_DAY);
  const total = p.year * 12 + (p.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const lastDay = daysInCalendarMonth(year, month);
  const clampedDay = Math.min(day, lastDay);
  return zonedDateTimeToUtc(year, month, clampedDay, 0, 0, 0, tz);
}
