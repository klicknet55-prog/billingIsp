import type { tagihan } from "@/lib/db/schema";

export type TagihanPelangganStatus =
  | "open"
  | "tunggakan"
  | "not_due"
  | "clear";

export interface TagihanPelangganRow {
  pelangganId: string;
  nama: string;
  noWa: string;
  paketNama: string | null;
  tglJatuhTempo: Date | null;
  activePeriode: string;
  activeDueDate: Date;
  bulanIni: typeof tagihan.$inferSelect | null;
  tunggakanTotal: number;
  tunggakanCount: number;
  status: TagihanPelangganStatus;
  isIsolated: boolean;
  canCatatNunggak: boolean;
}
