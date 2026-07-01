import type { CapacitorConfig } from "@capacitor/cli";

const base = (
  process.env.CAPACITOR_SERVER_URL || "https://isp.tunnelhost.my.id"
).replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "id.tunnelhost.netmanage.admin",
  appName: "NetManage Admin",
  webDir: "www",
  server: {
    url: `${base}/login?nm_app=admin`,
    cleartext: false,
    androidScheme: "https",
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
      backgroundColor: "#2563eb",
    },
  },
};

export default config;
