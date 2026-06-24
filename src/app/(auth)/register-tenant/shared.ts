export interface RegisterPkg {
  id: string;
  nama: string;
  hargaBulanan: number;
  diskonTahunanPersen: number;
  limitasi: { maxPelanggan: number; maxRouter: number; fitur: string[] };
}

export type BillingPeriod = "monthly" | "yearly";

/** Normalisasi JSON limitasi dari DB agar aman di client. */
export function normalizeRegisterPkg(raw: {
  id: string;
  nama: string;
  hargaBulanan: number;
  diskonTahunanPersen: number;
  limitasi: unknown;
}): RegisterPkg {
  const lim = raw.limitasi as Partial<RegisterPkg["limitasi"]> | null | undefined;
  return {
    id: raw.id,
    nama: raw.nama,
    hargaBulanan: raw.hargaBulanan,
    diskonTahunanPersen: raw.diskonTahunanPersen ?? 0,
    limitasi: {
      maxPelanggan: Number(lim?.maxPelanggan ?? 0),
      maxRouter: Number(lim?.maxRouter ?? 0),
      fitur: Array.isArray(lim?.fitur) ? lim.fitur.filter(Boolean) : [],
    },
  };
}

export function packageAmount(pkg: RegisterPkg, billingPeriod: BillingPeriod) {
  if (pkg.hargaBulanan <= 0 || billingPeriod === "monthly") return pkg.hargaBulanan;
  return Math.round((pkg.hargaBulanan * 12 * (100 - pkg.diskonTahunanPersen)) / 100);
}

export function normalizeBillingPeriod(
  raw: string | undefined,
  pkg: RegisterPkg
): BillingPeriod {
  if (pkg.hargaBulanan <= 0) return "monthly";
  return raw === "yearly" ? "yearly" : "monthly";
}
