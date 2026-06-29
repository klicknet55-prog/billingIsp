import Database from "better-sqlite3";
import { createDecipheriv, createHash, createHmac } from "node:crypto";

const tenantId = process.argv[2];
const userSecret = process.argv[3]?.trim();

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
const wh = db.prepare("SELECT * FROM tenant_webhook WHERE tenant_id = ?").get(tenantId);
if (!wh) {
  console.error("Webhook config not found");
  process.exit(1);
}

const secret = decryptSecret(wh.secret_encrypted);
const secretOk = userSecret ? secret === userSecret : true;
const testUrl = "http://127.0.0.1:3456";

db.prepare("UPDATE tenant_webhook SET url = ?, failure_count = 0 WHERE tenant_id = ?").run(
  testUrl,
  tenantId
);

const envelope = {
  event: "webhook.test",
  tenantId,
  timestamp: new Date().toISOString(),
  data: { message: "Event uji otomatis verifikasi" },
};
const body = JSON.stringify(envelope);
const signature = signBody(body, secret);

const started = Date.now();
const res = await fetch(testUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-NetManage-Signature": signature,
    "X-NetManage-Event": "webhook.test",
    "User-Agent": "NetManage-Webhook/1.0",
  },
  body,
  signal: AbortSignal.timeout(10_000),
});
const text = await res.text();
const durationMs = Date.now() - started;

console.log(
  JSON.stringify(
    {
      secretMatchesUserInput: secretOk,
      url: testUrl,
      httpStatus: res.status,
      responseBody: text,
      durationMs,
      signatureHeader: signature.slice(0, 20) + "…",
      pass: secretOk && res.status >= 200 && res.status < 300,
    },
    null,
    2
  )
);

db.close();
process.exit(secretOk && res.ok ? 0 : 1);
