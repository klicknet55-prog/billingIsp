import { createHmac } from "node:crypto";

export function signWebhookBody(body: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${digest}`;
}

export function verifyWebhookSignature(body: string, secret: string, header: string | null): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = signWebhookBody(body, secret);
  return expected === header.trim();
}
