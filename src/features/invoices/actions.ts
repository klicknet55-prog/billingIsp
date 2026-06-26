"use server";

import { requireUser } from "@/lib/auth";

const LEGACY_MSG =
  "Fitur invoice lama sudah diganti. Gunakan pembayaran tagihan di menu Pelanggan atau Kolektor.";

/** @deprecated Tagihan dibuat otomatis oleh cron — tidak dipakai lagi. */
export async function createInvoiceAction(_formData: FormData) {
  await requireUser(["owner", "admin"]);
  throw new Error(LEGACY_MSG);
}

/** @deprecated Gunakan payTagihanAction — tidak dipakai lagi. */
export async function markPaidAction(_formData: FormData) {
  await requireUser(["owner", "admin", "kolektor"]);
  throw new Error(LEGACY_MSG);
}
