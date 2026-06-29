# Verifikasi Webhook NetManage

NetManage mengirim **POST** JSON ke URL webhook tenant dengan header:

```
Content-Type: application/json
X-NetManage-Signature: sha256=<hex>
X-NetManage-Event: tagihan.paid
User-Agent: NetManage-Webhook/1.0
```

## Format body

```json
{
  "event": "tagihan.paid",
  "tenantId": "ten_xxx",
  "timestamp": "2026-06-18T10:00:00.000Z",
  "data": {
    "tagihanId": "tgh_xxx",
    "pelangganId": "pel_xxx",
    "amount": 150000,
    "paidAt": "2026-06-18T10:00:00.000Z",
    "metode": "QRIS"
  }
}
```

## Event yang didukung

| Event | `data` |
|-------|--------|
| `tagihan.paid` | `tagihanId`, `pelangganId`, `amount`, `paidAt`, `metode` |
| `pelanggan.isolated` | `pelangganId`, `reason`, `tunggakanTotal` |
| `pelanggan.activated` | `pelangganId` |
| `webhook.test` | `message` (event uji dari dashboard) |

## Verifikasi HMAC

Secret signing di-generate saat konfigurasi webhook disimpan (disimpan terenkripsi di server; tidak ditampilkan ulang kecuali regenerasi).

Hitung signature dari **raw body string** (UTF-8), bukan objek JSON yang di-parse ulang:

```javascript
const crypto = require("node:crypto");

function verifyNetManageWebhook(rawBody, secret, signatureHeader) {
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return signatureHeader === expected;
}
```

```python
import hmac
import hashlib

def verify_netmanage_webhook(raw_body: bytes, secret: str, signature_header: str) -> bool:
    digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return signature_header == f"sha256={digest}"
```

## Respons endpoint tenant

Kembalikan HTTP **2xx** jika event diterima. Status non-2xx atau timeout (10 detik) dicatat sebagai kegagalan delivery.

## Pengujian lokal

URL `http://localhost` atau `http://127.0.0.1` diperbolehkan untuk development. Production harus **HTTPS**.

Di dashboard **Integrasi → Webhook Keluar**, gunakan **Kirim event uji** setelah URL disimpan dan webhook diaktifkan.

Contoh listener Node.js minimal:

```javascript
const http = require("node:http");
const crypto = require("node:crypto");

const SECRET = "secret-dari-regenerasi-dashboard";

http
  .createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405);
      return res.end();
    }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const sig = req.headers["x-netmanage-signature"];
      const ok =
        sig ===
        "sha256=" + crypto.createHmac("sha256", SECRET).update(raw, "utf8").digest("hex");
      console.log("event:", req.headers["x-netmanage-event"], "valid:", ok, raw);
      res.writeHead(ok ? 200 : 401);
      res.end(ok ? "ok" : "invalid signature");
    });
  })
  .listen(3456);
```

Catatan: untuk melihat secret saat pengujian, centang **Regenerasi secret** saat simpan — secret plain hanya tersedia lewat regenerasi (sama pola API key: disimpan hash/encrypted di server).
