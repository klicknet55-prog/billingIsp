import { MOBILE_APP_NAMES } from "@/lib/mobile/app-names";
import { buildMyWifiAndroidIntentUrl } from "@/lib/mobile/portal-apk-link";

/** Browser Android eksternal (bukan WebView MyWiFi/Capacitor). */
export function isAndroidExternalBrowser(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  if (!ua.includes("android")) return false;
  if (ua.includes("wv)") || ua.includes("capacitor")) return false;
  return true;
}

export function shouldShowPortalPayLanding(
  userAgent: string,
  searchParams: URLSearchParams
): boolean {
  if (searchParams.has("browser") || searchParams.get("skip_app") === "1") return false;
  // Sudah dibuka dari shell MyWiFi (intent / App Link) — langsung login.
  if (searchParams.get("nm_app") === "portal") return false;
  return isAndroidExternalBrowser(userAgent);
}

export function buildPortalPayLandingHtml(input: {
  appOpenUrl: string;
  browserContinueUrl: string;
  appName?: string;
}): string {
  const appName = input.appName ?? MOBILE_APP_NAMES.portal;
  const intentUrl = buildMyWifiAndroidIntentUrl(input.appOpenUrl, input.browserContinueUrl);
  const continueUrl = input.browserContinueUrl;
  const fallbackMs = 4000;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Buka ${appName}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f1f5f9; color: #0f172a; }
    .card { background: #fff; border-radius: 12px; padding: 1.5rem; max-width: 22rem; width: 100%; box-shadow: 0 4px 24px rgba(15,23,42,.08); text-align: center; }
    h1 { font-size: 1.125rem; margin: 0 0 .5rem; }
    p { font-size: .875rem; color: #64748b; margin: 0 0 1.25rem; line-height: 1.5; }
    .btn { display: block; width: 100%; padding: .75rem 1rem; border-radius: 8px; font-size: .9375rem; font-weight: 600; text-decoration: none; box-sizing: border-box; margin-bottom: .5rem; border: none; cursor: pointer; }
    .primary { background: #2563eb; color: #fff; }
    .secondary { background: #fff; color: #2563eb; border: 1px solid #cbd5e1; }
    .hint { font-size: .75rem; color: #94a3b8; margin-top: .75rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Bayar tagihan</h1>
    <p>Buka aplikasi ${appName} atau lanjutkan di browser untuk masuk otomatis.</p>
    <a class="btn primary" id="open-app" href="${escapeAttr(intentUrl)}">Buka di ${appName}</a>
    <a class="btn secondary" id="open-browser" href="${escapeAttr(continueUrl)}">Lanjut di browser</a>
    <p class="hint">Tanpa ${appName}, pilih &quot;Lanjut di browser&quot;.</p>
  </div>
  <script>
    (function () {
      var intentUrl = ${JSON.stringify(intentUrl)};
      var continueUrl = ${JSON.stringify(continueUrl)};
      var storageKey = "nm_pay_landing_done:" + continueUrl;
      if (sessionStorage.getItem(storageKey) === "1") {
        window.location.replace(continueUrl);
        return;
      }
      var cancelled = false;
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) cancelled = true;
      });
      window.addEventListener("pagehide", function () { cancelled = true; });
      document.getElementById("open-browser").addEventListener("click", function () {
        sessionStorage.setItem(storageKey, "1");
        cancelled = true;
      });
      document.getElementById("open-app").addEventListener("click", function () {
        cancelled = true;
      });
      setTimeout(function () {
        if (cancelled) return;
        try { window.location.href = intentUrl; } catch (e) {}
      }, 600);
      setTimeout(function () {
        if (cancelled) return;
        sessionStorage.setItem(storageKey, "1");
        window.location.replace(continueUrl);
      }, ${fallbackMs});
    })();
  </script>
</body>
</html>`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
