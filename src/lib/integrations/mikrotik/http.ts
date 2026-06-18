import https from "node:https";

/** Izinkan sertifikat HTTPS self-signed / akses via IP (umum di RouterOS). */
export function mikrotikTlsInsecure(): boolean {
  const v = process.env.MIKROTIK_TLS_INSECURE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parseBody(body: RequestInit["body"]): string | Buffer | undefined {
  if (body == null) return undefined;
  if (typeof body === "string" || Buffer.isBuffer(body)) return body;
  return undefined;
}

function normalizeHeaders(
  init: RequestInit,
  body: string | Buffer | undefined
): Record<string, string> {
  const headers: Record<string, string> = {};
  const src = init.headers;
  if (src instanceof Headers) {
    src.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(src)) {
    for (const [key, value] of src) headers[key] = value;
  } else if (src) {
    Object.assign(headers, src);
  }
  if (body != null && !headers["Content-Length"] && !headers["content-length"]) {
    headers["Content-Length"] = String(Buffer.byteLength(body));
  }
  // RouterOS REST sering tidak menutup body saat keep-alive — paksa tutup koneksi.
  if (!headers.Connection && !headers.connection) {
    headers.Connection = "close";
  }
  return headers;
}

/** Bangun Response fetch; Node menolak status 204 dengan body. */
function buildFetchResponse(
  statusCode: number | undefined,
  statusMessage: string | undefined,
  rawHeaders: Record<string, string | string[] | undefined>,
  buf: Buffer
): Response {
  const responseHeaders = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value == null) continue;
    if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
    else responseHeaders.set(key, value);
  }

  const code = statusCode ?? 502;
  const emptySuccess = code === 204 || code === 205 || buf.length === 0;
  const safeStatus = code === 204 || code === 205 ? 200 : code;

  return new Response(emptySuccess ? null : new Uint8Array(buf), {
    status: safeStatus,
    statusText: statusMessage ?? "",
    headers: responseHeaders,
  });
}

/** Fetch ke RouterOS REST; gunakan https native agar TLS insecure & IP+hostname berfungsi. */
export async function routerOsFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const timeoutMs = 15_000;
  const parsed = new URL(url);
  const isHttps = parsed.protocol === "https:";
  const useInsecureTls = isHttps && mikrotikTlsInsecure();
  const method = init.method ?? "GET";
  const body = parseBody(init.body);
  const headers = normalizeHeaders(init, body);

  if (!isHttps || !useInsecureTls) {
    const headersWithClose = { ...headers, Connection: headers.Connection ?? "close" };
    return fetch(url, {
      ...init,
      headers: headersWithClose,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
  }

  return new Promise((resolve, reject) => {
    const port = parsed.port ? Number(parsed.port) : 443;
    const req = https.request(
      {
        hostname: parsed.hostname,
        port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers,
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(fallbackTimer);
          resolve(
            buildFetchResponse(res.statusCode, res.statusMessage, res.headers, Buffer.concat(chunks))
          );
        };

        // RouterOS kadang tidak emit 'end' meski DELETE sudah sukses.
        const fallbackTimer = setTimeout(finish, method === "DELETE" ? 400 : 15_000);

        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", finish);
        res.on("close", finish);
        res.on("error", (err) => {
          clearTimeout(fallbackTimer);
          if (!settled) reject(err);
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Timeout koneksi ke router"));
    });
    req.on("error", reject);
    if (body != null) req.write(body);
    req.end();
  });
}

export async function readRouterOsError(res: Response, ctx: string): Promise<string> {
  const raw = await res.text().catch(() => "");
  const detail = raw ? `: ${raw.slice(0, 240)}` : "";
  return `${ctx} gagal (HTTP ${res.status})${detail}`;
}

export function formatFetchError(err: unknown): string {
  const e = err as Error & { cause?: { code?: string } };
  const code = e.cause?.code ?? (e as NodeJS.ErrnoException).code ?? "";
  const msg = e.message || String(err);

  if (code === "ERR_TLS_CERT_ALTNAME_INVALID" || msg.includes("CERT_ALTNAME")) {
    return `${msg}. Pastikan MIKROTIK_TLS_INSECURE=true di .env, atau akses router via hostname yang sesuai sertifikat.`;
  }
  if (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    msg.includes("fetch failed") ||
    msg.includes("Timeout")
  ) {
    return `${msg}. Pastikan server aplikasi dapat menjangkau IP router (VPN/LAN), port benar, dan layanan REST/API aktif.`;
  }
  return msg;
}
