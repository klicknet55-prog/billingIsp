import { createLogger } from "@/lib/logger";

const log = createLogger("whatsapp:klicknet");

export interface KlicknetCredentials {
  baseUrl: string;
  username: string;
  password: string;
  deviceId?: string;
}

type GowaEnvelope = {
  code?: string | number;
  message?: string;
  results?: GowaQrPayload;
  data?: GowaQrPayload;
};

type GowaQrPayload = {
  device_id?: string;
  id?: string;
  qr_link?: string;
  qr_code?: string;
  qr_duration?: number;
  logged_in?: boolean;
  connected?: boolean;
};

function authHeader(username: string, password: string): string {
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function authHeaders(creds: KlicknetCredentials): Record<string, string> {
  return { Authorization: authHeader(creds.username, creds.password) };
}

async function gowaFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    const cause = e.cause as { code?: string; message?: string } | undefined;
    const code = cause?.code ?? "";
    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();

    if (code === "ENOTFOUND" || /getaddrinfo|could not resolve|fetch failed/i.test(e.message)) {
      throw new Error(
        `DNS tidak menemukan host "${host}". Periksa KLICKNET_WA_BASE_URL di .env — pastikan domain/IP benar dan bisa diakses dari server billing (bukan hanya dari browser VPN).`
      );
    }
    if (code === "ECONNREFUSED") {
      throw new Error(`Koneksi ditolak ke ${host}. Server GOWA mungkin mati atau port salah.`);
    }
    if (code === "CERT_HAS_EXPIRED" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      throw new Error(`Sertifikat SSL GOWA (${host}) tidak valid.`);
    }

    throw new Error(`Tidak dapat terhubung ke server GOWA (${url}): ${e.message}`);
  }
}

function extractPayload(data: GowaEnvelope): GowaQrPayload {
  const inner = data.results ?? data.data;
  return inner && typeof inner === "object" ? inner : {};
}

function resolveQrLink(payload: GowaQrPayload, baseUrl: string): string {
  if (payload.qr_link?.trim()) {
    const link = payload.qr_link.trim();
    if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("data:")) {
      return link;
    }
    const base = normalizeBaseUrl(baseUrl);
    return `${base}${link.startsWith("/") ? link : `/${link}`}`;
  }
  if (payload.qr_code?.startsWith("data:image")) return payload.qr_code;
  return "";
}

function isLoginPerIdNotImplemented(status: number, body: string): boolean {
  return (
    status === 500 &&
    body.includes("device login per ID is not implemented yet")
  );
}

async function readResponse(res: Response): Promise<{ text: string; json: GowaEnvelope }> {
  const text = await res.text();
  let json: GowaEnvelope = {};
  try {
    json = text ? (JSON.parse(text) as GowaEnvelope) : {};
  } catch {
    /* non-JSON body */
  }
  return { text, json };
}

/** Daftarkan slot device GOWA (field wajib: device_id). */
export async function klicknetCreateDevice(
  creds: KlicknetCredentials,
  deviceName: string
): Promise<{ deviceId: string }> {
  const base = normalizeBaseUrl(creds.baseUrl);
  const deviceId = deviceName.trim();
  if (!deviceId) throw new Error("Nama device wajib diisi.");

  const res = await gowaFetch(`${base}/devices`, {
    method: "POST",
    headers: {
      ...authHeaders(creds),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ device_id: deviceId }),
  });

  const { text, json } = await readResponse(res);

  if (res.ok) {
    const payload = extractPayload(json);
    return { deviceId: payload.device_id ?? payload.id ?? deviceId };
  }

  // Device sudah terdaftar — lanjut ke login QR.
  if (res.status === 409 || text.toLowerCase().includes("already exists")) {
    log.info(`Device ${deviceId} sudah ada, lanjut ambil QR`);
    return { deviceId };
  }

  log.error(`Create device gagal ${res.status}`, text);
  throw new Error(`Gagal buat device Klicknet: ${res.status} ${text.slice(0, 120)}`);
}

/** Ambil QR pairing — coba /devices/:id/login, fallback /app/login + X-Device-Id. */
export async function klicknetFetchQr(creds: KlicknetCredentials) {
  const base = normalizeBaseUrl(creds.baseUrl);
  const deviceId = creds.deviceId?.trim();
  if (!deviceId) throw new Error("Device ID belum diset.");

  const headers = authHeaders(creds);

  const devicesRes = await gowaFetch(`${base}/devices/${encodeURIComponent(deviceId)}/login`, {
    headers,
  });
  const devicesBody = await readResponse(devicesRes);

  if (devicesRes.ok) {
    const payload = extractPayload(devicesBody.json);
    const qrLink = resolveQrLink(payload, creds.baseUrl);
    if (qrLink) {
      return { qrLink, qrDuration: payload.qr_duration ?? 30 };
    }
  }

  const useAppLogin =
    !devicesRes.ok &&
    (isLoginPerIdNotImplemented(devicesRes.status, devicesBody.text) ||
      devicesRes.status === 404 ||
      devicesRes.status === 501);

  if (!useAppLogin && !devicesRes.ok) {
    throw new Error(
      `Gagal ambil QR: ${devicesRes.status} ${devicesBody.text.slice(0, 160)}`
    );
  }

  const appRes = await gowaFetch(`${base}/app/login`, {
    headers: { ...headers, "X-Device-Id": deviceId },
  });
  const appBody = await readResponse(appRes);

  if (!appRes.ok) {
    throw new Error(
      `Gagal ambil QR (app/login): ${appRes.status} ${appBody.text.slice(0, 160)}`
    );
  }

  const payload = extractPayload(appBody.json);
  const qrLink = resolveQrLink(payload, creds.baseUrl);
  if (!qrLink) {
    throw new Error("Respons QR kosong — periksa URL Klicknet dan Device ID.");
  }

  return { qrLink, qrDuration: payload.qr_duration ?? 30 };
}

export async function klicknetDeviceStatus(creds: KlicknetCredentials) {
  const base = normalizeBaseUrl(creds.baseUrl);
  const deviceId = creds.deviceId?.trim();
  if (!deviceId) return { connected: false };

  const headers = authHeaders(creds);

  const res = await fetch(`${base}/devices/${encodeURIComponent(deviceId)}/status`, {
    headers,
  });

  if (res.ok) {
    const { json } = await readResponse(res);
    const payload = extractPayload(json);
    const connected = Boolean(payload.logged_in ?? payload.connected);
    return { connected };
  }

  const appRes = await fetch(`${base}/app/status`, {
    headers: { ...headers, "X-Device-Id": deviceId },
  });
  if (!appRes.ok) return { connected: false };

  const { json } = await readResponse(appRes);
  const payload = extractPayload(json);
  return { connected: Boolean(payload.logged_in ?? payload.connected) };
}

export async function klicknetSendText(creds: KlicknetCredentials, phone: string, message: string) {
  const base = normalizeBaseUrl(creds.baseUrl);
  const headers: Record<string, string> = {
    ...authHeaders(creds),
    "Content-Type": "application/json",
  };
  if (creds.deviceId?.trim()) {
    headers["X-Device-Id"] = creds.deviceId.trim();
  }

  const res = await fetch(`${base}/send/message`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) {
    const detail = await res.text();
    log.error(`Kirim Klicknet gagal ${res.status}`, detail);
    throw new Error(`Klicknet WhatsApp gagal: ${res.status}`);
  }
}
