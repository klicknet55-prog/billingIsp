import { isNativeCapacitor, toCapacitorAbsoluteUrl } from "@/lib/mobile/capacitor-runtime";

function complaintApiUrl(): string {
  const path = "/api/portal/complaint";
  return isNativeCapacitor() ? toCapacitorAbsoluteUrl(path) : path;
}

export async function submitComplaintForm(fd: FormData): Promise<void> {
  let res: Response;
  try {
    res = await fetch(complaintApiUrl(), {
      method: "POST",
      body: fd,
      credentials: "include",
    });
  } catch {
    throw new Error("Koneksi gagal. Periksa internet lalu coba lagi.");
  }

  let payload: { ok?: boolean; error?: string } = {};
  try {
    payload = (await res.json()) as { ok?: boolean; error?: string };
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(payload.error ?? `Gagal mengirim laporan (${res.status}).`);
  }
  if (!payload.ok) {
    throw new Error(payload.error ?? "Gagal mengirim laporan.");
  }
}
