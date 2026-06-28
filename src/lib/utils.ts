import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAppTimeZone } from "@/lib/app-timezone";

/** Gabungkan className Tailwind dengan aman (menghindari konflik utility). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ID acak pendek & unik untuk primary key. */
export function newId(prefix = ""): string {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return prefix ? `${prefix}_${id}` : id;
}

/** Format angka ke Rupiah. */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

/** Format tanggal singkat (id-ID) di zona waktu app. */
export function formatDate(value: Date | number | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: getAppTimeZone(),
  }).format(d);
}

/** Periode tagihan untuk placeholder [[tagihan]] — contoh: Juni 2026 */
export function formatBillingPeriod(value: Date | number | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: getAppTimeZone(),
  }).format(d);
}
