import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth";
import { submitComplaint } from "@/features/portal/complaint-service";

/** POST multipart — submit lapor gangguan (lebih andal di Capacitor WebView daripada server action). */
export async function POST(req: Request) {
  const actor = await getCurrentActor();
  if (!actor || actor.type !== "pelanggan") {
    return NextResponse.json({ ok: false, error: "Sesi habis. Silakan login ulang." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Data formulir tidak valid." }, { status: 400 });
  }

  const fotoFile = formData.get("foto");
  const file = fotoFile instanceof File && fotoFile.size > 0 ? fotoFile : null;

  try {
    await submitComplaint({
      tenantId: actor.pelanggan.tenantId,
      pelangganId: actor.pelanggan.id,
      judul: String(formData.get("judul") ?? ""),
      deskripsi: String(formData.get("deskripsi") ?? "") || null,
      fotoFile: file,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengirim laporan.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  revalidatePath("/portal/lapor");
  return NextResponse.json({ ok: true });
}
