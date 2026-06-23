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

export function deserializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const key of [
    "createdAt",
    "updatedAt",
    "mulai",
    "akhir",
    "tglJatuhTempo",
    "tglLunas",
    "preDueRemindedAt",
    "tanggal",
    "assignedAt",
    "expiresAt",
    "consumedAt",
  ]) {
    const v = out[key];
    if (typeof v === "string" && v) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) out[key] = d;
    }
  }
  return out;
}
