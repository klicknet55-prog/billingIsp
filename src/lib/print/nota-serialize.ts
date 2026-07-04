import type { NotaDocumentData } from "@/lib/print/nota-document";

/** Konversi data receipt server → payload client cetak/PDF. */
export function toNotaDocumentData(input: {
  namaUsaha: string;
  logoUrl?: string | null;
  noNota: string;
  pelangganNama: string;
  pelangganWa?: string | null;
  pelangganAlamat?: string | null;
  tglBayar: Date | null | undefined;
  metodeBayar?: string | null;
  lineItems: { periode: string; label: string; amount: number }[];
  total: number;
  compactPelanggan?: boolean;
}): NotaDocumentData {
  return {
    namaUsaha: input.namaUsaha,
    logoUrl: input.logoUrl,
    noNota: input.noNota,
    pelangganNama: input.pelangganNama,
    pelangganWa: input.pelangganWa,
    pelangganAlamat: input.pelangganAlamat,
    tglBayar: input.tglBayar ? input.tglBayar.toISOString() : null,
    metodeBayar: input.metodeBayar,
    lineItems: input.lineItems,
    total: input.total,
    compactPelanggan: input.compactPelanggan,
  };
}
