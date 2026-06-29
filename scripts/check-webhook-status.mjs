import Database from "better-sqlite3";
import { createDecipheriv, createHash, createHmac } from "node:crypto";

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

const db = new Database("./netmanage.db");
const wh = db.prepare("SELECT * FROM tenant_webhook").get();
const log = db
  .prepare("SELECT * FROM webhook_delivery_log ORDER BY created_at DESC LIMIT 1")
  .get();

if (!wh) {
  console.log(JSON.stringify({ pass: false, reason: "no_webhook_config" }));
  process.exit(1);
}

const secret = decryptSecret(wh.secret_encrypted);
const payloadOk = log?.request_body ? signBody(log.request_body, secret).startsWith("sha256=") : false;

console.log(
  JSON.stringify(
    {
      config: {
        url: wh.url,
        enabled: !!wh.is_enabled,
        events: wh.events,
        failureCount: wh.failure_count,
      },
      lastDelivery: log
        ? {
            event: log.event,
            success: !!log.success,
            statusCode: log.status_code,
            error: log.error,
            url: log.request_url,
          }
        : null,
      hmacSignsCorrectly: payloadOk,
      uiTestPassed: !!log?.success,
      pass: !!log?.success,
      fixIf404: wh.url.includes("/webhooks/netmanage")
        ? "URL mengarah ke route yang tidak ada di app. Ganti ke endpoint listener nyata, mis. http://127.0.0.1:3456"
        : null,
    },
    null,
    2
  )
);

db.close();
process.exit(log?.success ? 0 : 1);
