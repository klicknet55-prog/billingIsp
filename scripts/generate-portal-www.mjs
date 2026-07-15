/**
 * Generate mobile/portal/www/index.html — shell lokal yang redirect ke production.
 * Production APK tidak memakai server.url (hindari WebView gagal load remote langsung).
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
const loginUrl = `${origin}/portal/login?nm_app=portal`;

const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>MyWiFi</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #2563eb; color: #fff; font-family: system-ui, sans-serif; }
    p { font-size: 0.875rem; opacity: 0.9; }
  </style>
</head>
<body>
  <p>Memuat MyWiFi…</p>
  <script>
    (function () {
      var origin = ${JSON.stringify(origin)};
      var loginUrl = ${JSON.stringify(loginUrl)};
      var tries = 0;
      var maxTries = 60;

      function isDeepLink(url) {
        try {
          var parsed = new URL(url, origin + "/");
          if (parsed.pathname.startsWith("/p/") && parsed.pathname.length > 3) return true;
          if (parsed.pathname.startsWith("/portal/") &&
              parsed.pathname !== "/portal/login" &&
              parsed.pathname !== "/portal/mobile-bootstrap") return true;
          return false;
        } catch (e) {
          return false;
        }
      }

      function withPortalParam(url) {
        try {
          var parsed = new URL(url, origin + "/");
          if (!parsed.searchParams.has("nm_app")) parsed.searchParams.set("nm_app", "portal");
          return parsed.href;
        } catch (e) {
          return loginUrl;
        }
      }

      function goLogin() {
        sessionStorage.setItem("nm_app", "portal");
        window.location.replace(loginUrl);
      }

      function goDeepLink(url) {
        sessionStorage.setItem("nm_app", "portal");
        window.location.replace(withPortalParam(url));
      }

      function tick() {
        tries += 1;
        var cap = window.Capacitor;
        var app = cap && cap.Plugins && cap.Plugins.App;
        if (!app || typeof app.getLaunchUrl !== "function") {
          if (tries >= maxTries) {
            goLogin();
            return;
          }
          setTimeout(tick, 50);
          return;
        }
        app.getLaunchUrl().then(function (launch) {
          if (launch && launch.url && isDeepLink(launch.url)) {
            goDeepLink(launch.url);
            return;
          }
          goLogin();
        }).catch(goLogin);
      }

      tick();
    })();
  </script>
</body>
</html>
`;

const outDir = join(root, "mobile", "portal", "www");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.html"), html, "utf8");
console.log(`✓ portal www shell → ${origin}`);
