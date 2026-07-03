import type { CapacitorConfig } from "@capacitor/cli";

const base = (
  process.env.CAPACITOR_SERVER_URL || "https://isp.tunnelhost.my.id"
).replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "id.tunnelhost.netmanage.portal",
  appName: "MyWiFi",
  webDir: "www",
  server: {
    url: `${base}/portal/login?nm_app=portal`,
    cleartext: false,
    androidScheme: "https",
    errorPath: "error.html",
  },
  android: {
    allowMixedContent: false,
    appendUserAgent: "MyWiFiCapacitorShell/1",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
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
