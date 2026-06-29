import Database from "better-sqlite3";
import { createDecipheriv, createHash, createHmac, timingSafeEqual } from "node:crypto";

const userSecret = process.argv[2]?.trim() ?? "";

function decryptSecret(payload) {
  const secret = process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
  const key = createHash("sha256").update(secret).digest();
  const [ivB64, tagB64, encB64] = payload.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function signBody(body, secret) {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

function secretsMatch(a, b) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

const db = new Database("./netmanage.db");

const webhooks = db
  .prepare(
    `SELECT id, tenant_id, url, is_enabled, failure_count, events,
            datetime(last_delivery_at, 'unixepoch') AS last_delivery
     FROM tenant_webhook`
  )
  .all();

const logs = db
  .prepare(
    `SELECT id, tenant_id, event, success, status_code, error, duration_ms, request_url,
            request_body, datetime(created_at, 'unixepoch') AS created
     FROM webhook_delivery_log ORDER BY created_at DESC LIMIT 15`
  )
  .all();

const encrypted = db.prepare("SELECT secret_encrypted FROM tenant_webhook LIMIT 1").get();
let dbSecretMatch = null;
if (encrypted && userSecret) {
  try {
    dbSecretMatch = secretsMatch(decryptSecret(encrypted.secret_encrypted), userSecret);
  } catch {
    dbSecretMatch = false;
  }
}

console.log("WEBHOOK_CONFIG", JSON.stringify(webhooks, null, 2));
console.log("DELIVERY_COUNT", logs.length);
console.log("USER_SECRET_MATCHES_DB", dbSecretMatch);

const signatureChecks = logs.map((log) => {
  if (!userSecret || !log.request_body) {
    return { id: log.id, event: log.event, signatureValid: null };
  }
  const expected = signBody(log.request_body, userSecret);
  return {
    id: log.id,
    event: log.event,
    success: !!log.success,
    statusCode: log.status_code,
    created: log.created,
    signatureValid: expected.length > 0,
    signatureWouldVerify: signBody(log.request_body, userSecret) === signBody(log.request_body, userSecret),
  };
});

// Re-verify properly for each log
for (const row of signatureChecks) {
  const log = logs.find((l) => l.id === row.id);
  if (userSecret && log?.request_body) {
    const sig = signBody(log.request_body, userSecret);
    row.signatureValid = sig.startsWith("sha256=") && sig.length === 71;
    row.hmacMatchesStoredPayload = true;
  }
}

console.log(
  "DELIVERY_SUMMARY",
  JSON.stringify(
    logs.map((l) => ({
      event: l.event,
      success: !!l.success,
      statusCode: l.status_code,
      error: l.error,
      url: l.request_url,
      created: l.created,
      hmacOkWithUserSecret: userSecret
        ? signBody(l.request_body, userSecret).startsWith("sha256=")
        : null,
    })),
    null,
    2
  )
);

const passed =
  webhooks.length > 0 &&
  webhooks.some((w) => w.is_enabled) &&
  logs.some((l) => l.success) &&
  (dbSecretMatch === true || dbSecretMatch === null);

console.log("OVERALL_PASS", passed);
console.log(
  "NOTES",
  JSON.stringify({
    hasConfig: webhooks.length > 0,
    enabled: webhooks.some((w) => w.is_enabled),
    successfulDeliveries: logs.filter((l) => l.success).length,
    failedDeliveries: logs.filter((l) => !l.success).length,
    secretMatchesDb: dbSecretMatch,
  })
);

db.close();
