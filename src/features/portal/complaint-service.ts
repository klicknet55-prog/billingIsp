import "server-only";
import { createTicket } from "@/features/tickets/service";
import { savePublicUpload } from "@/lib/uploads";

export type SubmitComplaintInput = {
  tenantId: string;
  pelangganId: string;
  judul: string;
  deskripsi: string | null;
  fotoFile?: File | null;
};

export async function submitComplaint(input: SubmitComplaintInput): Promise<void> {
  const judul = input.judul.trim();
  if (!judul) throw new Error("Judul wajib diisi.");

  let fotoUrl: string | null = null;
  if (input.fotoFile instanceof File && input.fotoFile.size > 0) {
    try {
      fotoUrl = await savePublicUpload("tickets", input.fotoFile, { prefix: input.pelangganId });
    } catch (err) {
      throw err instanceof Error ? err : new Error("Gagal mengunggah foto.");
    }
  }

  await createTicket(input.tenantId, {
    pelangganId: input.pelangganId,
    judul,
    deskripsi: input.deskripsi,
    fotoUrl,
  });
}
