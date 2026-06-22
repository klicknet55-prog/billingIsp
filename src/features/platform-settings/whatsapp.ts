/** Normalisasi nomor ke format wa.me (62xxx tanpa +). */
export function normalizeWhatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export function whatsappUrl(phone: string, message?: string): string | null {
  const normalized = normalizeWhatsappNumber(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  if (message?.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
}
