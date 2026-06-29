import http from "node:http";
import crypto from "node:crypto";

const SECRET = process.argv[2] ?? "";

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("method not allowed");
    return;
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    const sig = req.headers["x-netmanage-signature"] ?? "";
    const expected =
      "sha256=" + crypto.createHmac("sha256", SECRET).update(raw, "utf8").digest("hex");
    const valid = sig === expected;
    console.log(JSON.stringify({ event: req.headers["x-netmanage-event"], valid, status: valid ? "OK" : "INVALID_SIG", body: raw.slice(0, 200) }));
    res.writeHead(valid ? 200 : 401);
    res.end(valid ? "ok" : "invalid");
  });
});

server.listen(3456, "127.0.0.1", () => {
  console.log("LISTENING http://127.0.0.1:3456");
});
