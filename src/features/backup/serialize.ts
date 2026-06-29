/** Serialisasi baris DB → JSON (timestamp jadi ISO string). */
export function serializeRow<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Kolom timestamp Drizzle (SQLite mode: "timestamp") — wajib jadi Date saat insert. */
const TIMESTAMP_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "mulai",
  "akhir",
  "remind7dAt",
  "remind1dAt",
  "tglDaftar",
  "tglJatuhTempo",
  "tglLunas",
  "dueDate",
  "preDueRemindedAt",
  "dunningStep2At",
  "dunningFinalAt",
  "paidAt",
  "tanggal",
  "assignedAt",
  "expiresAt",
  "consumedAt",
  "lastUsedAt",
  "revokedAt",
  "lastDeliveryAt",
  "startedAt",
  "finishedAt",
  "cronLastRunAt",
]);

function parseTimestamp(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

export function deserializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of Object.keys(out)) {
    if (!TIMESTAMP_KEYS.has(key)) continue;
    const parsed = parseTimestamp(out[key]);
    if (parsed) out[key] = parsed;
  }
  return out;
}
