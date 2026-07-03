import type { CapacitorConfig } from "@capacitor/cli";

const base = (
  process.env.CAPACITOR_SERVER_URL || "https://isp.tunnelhost.my.id"
).replace(/\/$/, "");
const isDevServer = base.startsWith("http://");

const config: CapacitorConfig = {
  appId: "id.tunnelhost.netmanage.admin",
  appName: "Admin.net",
  webDir: "www",
  server: {
    url: `${base}/login?nm_app=admin`,
    cleartext: isDevServer,
    androidScheme: isDevServer ? "http" : "https",
  },
  android: {
    allowMixedContent: false,
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
