/** URL redirect browser setelah pembayaran Duitku (GET), terpisah dari callback webhook (POST). */
export function resolveDuitkuReturnUrl(callbackUrl: string): string {
  const fromEnv = process.env.DUITKU_RETURN_URL?.trim();
  if (fromEnv) return fromEnv;

  try {
    const u = new URL(callbackUrl);
    u.pathname = "/bayar/selesai";
    u.search = "";
    return u.toString();
  } catch {
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    return base ? `${base}/bayar/selesai` : "/bayar/selesai";
  }
}
