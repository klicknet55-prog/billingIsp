/** HTML ringan — entry point shell MyWiFi; redirect sebelum React/hydration. */
export function buildPortalMobileBootstrapHtml(appOrigin: string): string {
  const origin = appOrigin.replace(/\/$/, "");
  const loginUrl = `${origin}/portal/login?nm_app=portal`;

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
      var origin = ${JSON.stringify(origin)};
      var loginUrl = ${JSON.stringify(loginUrl)};
      var tries = 0;
      var maxTries = 40;

      function isPaymentDeepLink(url) {
        try {
          var parsed = new URL(url, origin + "/");
          return parsed.pathname.startsWith("/p/") && parsed.pathname.length > 3;
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

      function goPaymentLink(url) {
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
          if (launch && launch.url && isPaymentDeepLink(launch.url)) {
            goPaymentLink(launch.url);
            return;
          }
          goLogin();
        }).catch(goLogin);
      }

      tick();
    })();
  </script>
</body>
</html>`;
}
