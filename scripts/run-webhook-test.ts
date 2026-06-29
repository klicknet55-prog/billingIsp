import Database from "better-sqlite3";
import { dispatchWebhookEvent } from "../src/features/webhooks/dispatch";

const tenantId = process.argv[2];
if (!tenantId) {
  console.error("Usage: tenantId required");
  process.exit(1);
}

const db = new Database("./netmanage.db");
db.prepare("UPDATE tenant_webhook SET url = ?, failure_count = 0 WHERE tenant_id = ?").run(
  "http://127.0.0.1:3456",
  tenantId
);
db.close();

const result = await dispatchWebhookEvent(tenantId, "webhook.test", {
  message: "Event uji otomatis verifikasi",
});
console.log("DISPATCH_RESULT", JSON.stringify(result));
