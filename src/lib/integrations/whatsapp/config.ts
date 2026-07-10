/** URL SERVER KLICKnet dari .env (prioritas KLICKNET_WA_BASE_URL). */
export function getGowaBaseUrlFromEnv(): string {
  return (process.env.KLICKNET_WA_BASE_URL ?? process.env.WHATSAPP_API_URL ?? "").trim();
}

export function getGowaBasicUserFromEnv(): string {
  return (process.env.KLICKNET_WA_BASIC_USER ?? "").trim();
}

export function getGowaBasicPasswordFromEnv(): string {
  return (process.env.KLICKNET_WA_BASIC_PASSWORD ?? "").trim();
}

export type GowaEnvDefaults = {
  baseUrl: string;
  basicUser: string;
  hasBasicPassword: boolean;
};

export function getGowaEnvDefaults(): GowaEnvDefaults {
  return {
    baseUrl: getGowaBaseUrlFromEnv(),
    basicUser: getGowaBasicUserFromEnv(),
    hasBasicPassword: getGowaBasicPasswordFromEnv().length > 0,
  };
}

/** URL + Basic Auth lengkap dari .env — admin cukup pilih KLICKnet & scan QR. */
export function isGowaFullyFromEnv(): boolean {
  const env = getGowaEnvDefaults();
  return env.baseUrl.length > 0 && env.basicUser.length > 0 && env.hasBasicPassword;
}

export function resolveGowaBasicAuthUser(formUser: string): string {
  const fromEnv = getGowaBasicUserFromEnv();
  if (fromEnv) return fromEnv;
  return formUser.trim();
}

export function resolveGowaBasicAuthPassword(formPassword: string): string {
  const fromEnv = getGowaBasicPasswordFromEnv();
  if (fromEnv) return fromEnv;
  return formPassword.trim();
}

export function resolveWhatsAppApiUrl(
  provider: "gateway" | "waba" | "klicknet",
  formUrl: string
): string {
  if (provider === "klicknet") {
    const fromEnv = getGowaBaseUrlFromEnv();
    if (fromEnv) return fromEnv;
  }
  return formUrl.trim();
}

export function isGowaUrlFromEnv(): boolean {
  return getGowaBaseUrlFromEnv().length > 0;
}

export function resolveKlicknetAuth(stored: {
  basicAuthUser?: string | null;
  password?: string;
}): { username: string; password: string } {
  return {
    username: stored.basicAuthUser?.trim() || getGowaBasicUserFromEnv(),
    password: stored.password?.trim() || getGowaBasicPasswordFromEnv(),
  };
}

const GOWA_DEVICE_ID_MAX = 64;

/** Slug aman untuk device_id GOWA (huruf, angka, strip). */
export function slugifyGowaDevicePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function getKlicknetDevicePrefix(input: {
  scope: "platform" | "tenant";
  tenantId?: string;
  tenantDomain?: string;
}): string {
  if (input.scope === "platform") return "platform";
  const fromDomain = slugifyGowaDevicePart(input.tenantDomain ?? "");
  if (fromDomain) return fromDomain;
  const fromId = (input.tenantId ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 16);
  return fromId || "tenant";
}

/** Gabung prefix scope + nama device agar unik di SERVER KLICKnet bersama. */
export function buildKlicknetDeviceId(input: {
  scope: "platform" | "tenant";
  tenantId?: string;
  tenantDomain?: string;
  rawName: string;
}): string {
  const prefix = getKlicknetDevicePrefix(input);
  const raw = slugifyGowaDevicePart(input.rawName) || "wa";
  if (raw === prefix || raw.startsWith(`${prefix}-`)) {
    return raw.slice(0, GOWA_DEVICE_ID_MAX);
  }
  return `${prefix}-${raw}`.slice(0, GOWA_DEVICE_ID_MAX);
}

/** Ambil suffix nama device untuk ditampilkan di form (tanpa prefix tenant). */
export function klicknetDeviceSuffix(storedDeviceId: string, prefix: string): string {
  const p = `${prefix}-`;
  if (storedDeviceId.startsWith(p)) return storedDeviceId.slice(p.length);
  return storedDeviceId;
}
