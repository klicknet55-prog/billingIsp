/**
 * Generate mobile/admin/www/index.html — shell lokal redirect ke production.
 * Hindari server.url remote langsung (sering "This page couldn't load" setelah login).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const base = (
  process.env.CAPACITOR_SERVER_URL || "https://netmanage.tunnelhost.my.id"
).replace(/\/$/, "");
const origin = base;
const loginUrl = `${origin}/login?nm_app=admin`;

const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Admin.net</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #1e40af; color: #fff; font-family: system-ui, sans-serif; }
    p { font-size: 0.875rem; opacity: 0.9; }
  </style>
</head>
<body>
  <p>Memuat Admin.net…</p>
  <script>
    (function () {
      var loginUrl = ${JSON.stringify(loginUrl)};
      sessionStorage.setItem("nm_app", "admin");
      window.location.replace(loginUrl);
    })();
  </script>
</body>
</html>
`;

const outDir = join(root, "mobile", "admin", "www");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.html"), html, "utf8");
console.log(`✓ admin www shell → ${origin}`);
