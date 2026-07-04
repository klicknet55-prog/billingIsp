import "server-only";
import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type FcmCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

let cachedJwt: JWT | null = null;
let cachedProjectId: string | null = null;

function parseServiceAccountJson(raw: string): ServiceAccountJson | null {
  try {
    return JSON.parse(raw) as ServiceAccountJson;
  } catch {
    return null;
  }
}

function fromServiceAccountJson(json: ServiceAccountJson): FcmCredentials | null {
  const projectId = json.project_id?.trim();
  const clientEmail = json.client_email?.trim();
  const privateKey = json.private_key?.trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/** Muat kredensial FCM HTTP v1 dari env (service account JSON). */
export function loadFcmCredentials(): FcmCredentials | null {
  const inlineJson = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    const parsed = parseServiceAccountJson(inlineJson);
    if (parsed) {
      const creds = fromServiceAccountJson(parsed);
      if (creds) return creds;
    }
  }

  const projectId = process.env.FCM_PROJECT_ID?.trim();
  const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    try {
      const parsed = parseServiceAccountJson(readFileSync(credPath, "utf8"));
      if (parsed) {
        const creds = fromServiceAccountJson(parsed);
        if (creds) return creds;
      }
    } catch {
      /* file missing or unreadable */
    }
  }

  return null;
}

export function isFcmConfigured(): boolean {
  return loadFcmCredentials() !== null;
}

async function getAccessToken(creds: FcmCredentials): Promise<string | null> {
  if (
    !cachedJwt ||
    cachedProjectId !== creds.projectId ||
    cachedJwt.email !== creds.clientEmail
  ) {
    cachedJwt = new JWT({
      email: creds.clientEmail,
      key: creds.privateKey,
      scopes: [FCM_SCOPE],
    });
    cachedProjectId = creds.projectId;
  }

  const tokenResponse = await cachedJwt.getAccessToken();
  return tokenResponse.token ?? null;
}

export type FcmSendResult = {
  ok: boolean;
  attempts: number;
  response?: string;
  error?: string;
  tokenInvalid?: boolean;
};

/** Kirim satu pesan ke device token via FCM HTTP v1. */
export async function sendFcmV1Message(input: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<FcmSendResult> {
  const creds = loadFcmCredentials();
  if (!creds) {
    return {
      ok: false,
      attempts: 0,
      error: "FCM belum dikonfigurasi (service account / FCM_PROJECT_ID).",
    };
  }

  const accessToken = await getAccessToken(creds);
  if (!accessToken) {
    return { ok: false, attempts: 0, error: "Gagal mendapatkan OAuth token FCM." };
  }

  const url = `https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`;
  const payload = {
    message: {
      token: input.token,
      notification: { title: input.title, body: input.body },
      data: {
        ...(input.data ?? {}),
        title: input.title,
        body: input.body,
      },
      android: { priority: "HIGH" as const },
    },
  };

  let lastError = "";
  let lastResponse = "";
  let tokenInvalid = false;

  for (let i = 1; i <= 2; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      lastResponse = text;

      if (res.ok) return { ok: true, attempts: i, response: text };

      lastError = `HTTP ${res.status}`;
      if (
        res.status === 404 ||
        text.includes("UNREGISTERED") ||
        text.includes("NOT_FOUND")
      ) {
        tokenInvalid = true;
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    ok: false,
    attempts: tokenInvalid ? 1 : 2,
    error: lastError,
    response: lastResponse,
    tokenInvalid,
  };
}
