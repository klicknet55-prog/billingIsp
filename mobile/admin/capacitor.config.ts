import type { CapacitorConfig } from "@capacitor/cli";

const base = (
  process.env.CAPACITOR_SERVER_URL || "https://netmanage.tunnelhost.my.id"
).replace(/\/$/, "");
const isDevServer = base.startsWith("http://");

let appHost = "netmanage.tunnelhost.my.id";
try {
  appHost = new URL(base).hostname;
} catch {
  /* default */
}

/**
 * Dev (http LAN): load langsung dari Next.js.
 * Production: shell lokal www → redirect HTTPS + allowNavigation (hindari WebView blank setelah login).
 */
const server: CapacitorConfig["server"] = isDevServer
  ? {
      url: `${base}/login?nm_app=admin`,
      cleartext: true,
      androidScheme: "http",
    }
  : {
      androidScheme: "https",
      allowNavigation: [appHost, "*.tunnelhost.my.id"],
    };

const config: CapacitorConfig = {
  appId: "id.tunnelhost.netmanage.admin",
  appName: "Admin.net",
  webDir: "www",
  server,
  android: {
    allowMixedContent: false,
    appendUserAgent: "Admin.netCapacitorShell/1",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1e40af",
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
