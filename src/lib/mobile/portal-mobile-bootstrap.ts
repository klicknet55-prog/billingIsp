/** HTML ringan — entry point shell MyWiFi; redirect sebelum React/hydration. */
export function buildPortalMobileBootstrapHtml(): string {
  return `<!DOCTYPE html>
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
      var loginUrl = "/portal/login?nm_app=portal";
      var tries = 0;
      var maxTries = 80;

      function withPortalParam(url) {
        try {
          var parsed = new URL(url, window.location.origin);
          if (!parsed.pathname.startsWith("/p/") && !parsed.pathname.startsWith("/portal/")) return loginUrl;
          if (!parsed.searchParams.has("nm_app")) parsed.searchParams.set("nm_app", "portal");
          return parsed.pathname + parsed.search + parsed.hash;
        } catch (e) {
          return loginUrl;
        }
      }

      function goLogin() {
        sessionStorage.setItem("nm_app", "portal");
        window.location.replace(loginUrl);
      }

      function goTarget(url) {
        sessionStorage.setItem("nm_app", "portal");
        window.location.replace(withPortalParam(url));
      }

      function tick() {
        tries += 1;
        var cap = window.Capacitor;
        var app = cap && cap.Plugins && cap.Plugins.App;
        if (app && typeof app.getLaunchUrl === "function") {
          app.getLaunchUrl().then(function (launch) {
            if (launch && launch.url) {
              goTarget(launch.url);
              return;
            }
            goLogin();
          }).catch(goLogin);
          return;
        }
        if (tries >= maxTries) {
          goLogin();
          return;
        }
        setTimeout(tick, 50);
      }

      tick();
    })();
  </script>
</body>
</html>`;
}
