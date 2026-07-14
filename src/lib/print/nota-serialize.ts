import type { NotaDocumentData } from "@/lib/print/nota-document";

/** Konversi data receipt server → payload client cetak/PDF. */
export function toNotaDocumentData(input: NotaDocumentData): NotaDocumentData {
  return {
    ...input,
    tglBayar:
      typeof input.tglBayar === "string" || input.tglBayar == null
        ? input.tglBayar
        : new Date(input.tglBayar as unknown as Date).toISOString(),
  };
}
