const DEFAULT_TIME_ZONE = "Asia/Jakarta";

let cachedTimeZone: string | null = null;

/** Zona waktu operasional platform (billing, cron, format tanggal server). */
export function getAppTimeZone(): string {
  if (cachedTimeZone) return cachedTimeZone;

  const candidate =
    process.env.APP_TIMEZONE?.trim() ||
    process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim() ||
    DEFAULT_TIME_ZONE;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate });
    cachedTimeZone = candidate;
  } catch {
    cachedTimeZone = DEFAULT_TIME_ZONE;
  }
  return cachedTimeZone;
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getZonedParts(date: Date, timeZone = getAppTimeZone()): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const lookup: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type === "literal") continue;
    lookup[part.type] = Number(part.value);
  }
  return {
    year: lookup.year ?? 0,
    month: lookup.month ?? 0,
    day: lookup.day ?? 0,
    hour: lookup.hour ?? 0,
    minute: lookup.minute ?? 0,
    second: lookup.second ?? 0,
  };
}

/** UTC instant untuk waktu kalender tertentu di zona waktu app. */
export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone = getAppTimeZone()
): Date {
  const base = Date.UTC(year, month - 1, day, 12, 0, 0);
  for (let offset = -28; offset <= 28; offset++) {
    const t = base + offset * 3600_000;
    const p = getZonedParts(new Date(t), timeZone);
    if (
      p.year === year &&
      p.month === month &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute &&
      p.second === second
    ) {
      return new Date(t);
    }
  }
  throw new Error(
    `Cannot resolve ${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${hour}:${minute} in ${timeZone}`
  );
}

/** 00:00:00 pada hari kalender `date` di zona waktu app. */
export function startOfDayInAppTz(date: Date, timeZone = getAppTimeZone()): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return zonedDateTimeToUtc(year, month, day, 0, 0, 0, timeZone);
}

/** Parse input HTML date (YYYY-MM-DD) sebagai tengah malam di zona waktu app. */
export function parseDateOnlyInAppTz(value: string, timeZone = getAppTimeZone()): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    return zonedDateTimeToUtc(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      0,
      0,
      0,
      timeZone
    );
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Jumlah hari dalam bulan kalender (month 1–12). */
export function daysInCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
