const TELEGRAM_HOSTS = ["t.me", "telegram.me", "telegram.dog"];

export function normalizeTelegramGroupUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\./, "");
  if (!TELEGRAM_HOSTS.includes(host)) return null;

  return url.toString().replace(/\/$/, "");
}

export function isValidTelegramGroupUrl(raw: string): boolean {
  if (!raw.trim()) return true;
  return normalizeTelegramGroupUrl(raw) !== null;
}
