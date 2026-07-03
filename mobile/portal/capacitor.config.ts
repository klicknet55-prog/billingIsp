import type { CapacitorConfig } from "@capacitor/cli";

const base = (
  process.env.CAPACITOR_SERVER_URL || "https://isp.tunnelhost.my.id"
).replace(/\/$/, "");
const isDevServer = base.startsWith("http://");

let appHost = "isp.tunnelhost.my.id";
try {
  appHost = new URL(base).hostname;
} catch {
  /* default production host */
}

/**
 * Dev (http LAN): load langsung dari dev server.
 * Production: shell lokal www/index.html → redirect HTTPS (hindari WebView gagal load remote).
 */
const server: CapacitorConfig["server"] = isDevServer
  ? {
      url: `${base}/portal/login?nm_app=portal`,
      cleartext: true,
      androidScheme: "http",
    }
  : {
      androidScheme: "https",
      allowNavigation: [appHost, "*.tunnelhost.my.id", "*.tunnelhost.netmanage.portal"],
    };

const config: CapacitorConfig = {
  appId: "id.tunnelhost.netmanage.portal",
  appName: "MyWiFi",
  webDir: "www",
  server,
  android: {
    allowMixedContent: false,
    appendUserAgent: "MyWiFiCapacitorShell/1",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#2563eb",
      showSpinner: true,
      spinnerColor: "#ffffff",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
  },
};

export default config;
