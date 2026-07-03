/**
 * Jalankan shell Capacitor ke Next.js dev server (LAN / emulator).
 *
 * Prasyarat:
 *   npm run dev          — di terminal lain (bind 0.0.0.0)
 *   HP/emulator          — same WiFi (LAN) atau adb reverse
 *
 * Contoh:
 *   npm run mobile:portal:dev
 *   npm run mobile:portal:dev -- --apk
 *   CAPACITOR_DEV_HOST=192.168.1.10 npm run mobile:admin:dev
 */
import { spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  join(process.env.LOCALAPPDATA || "", "Android", "Sdk");

const jbr = "C:\\Program Files\\Android\\Android Studio\\jbr";
const javaHome = existsSync(jbr) ? jbr : process.env.JAVA_HOME;

const args = process.argv.slice(2);
const portalOnly = args.includes("--portal") || args.includes("--portal-only");
const adminOnly = args.includes("--admin") || args.includes("--admin-only");
const apkOnly = args.includes("--apk");
const apps = portalOnly ? ["portal"] : adminOnly ? ["admin"] : ["portal"];

const port = process.env.CAPACITOR_DEV_PORT || "3000";

function detectLanHost() {
  if (process.env.CAPACITOR_DEV_HOST) return process.env.CAPACITOR_DEV_HOST;
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== "IPv4" || net.internal) continue;
      if (net.address.startsWith("169.254.")) continue;
      if (name.toLowerCase().includes("virtualbox")) continue;
      return net.address;
    }
  }
  return "127.0.0.1";
}

function run(cmd, cmdArgs, cwd, env = {}, options = {}) {
  console.log(`\n> ${cmd} ${cmdArgs.join(" ")}`);
  const res = spawnSync(cmd, cmdArgs, {
    cwd,
    stdio: "inherit",
    shell: options.shell ?? true,
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function hasAndroidTarget() {
  const adb = join(sdk, "platform-tools", "adb.exe");
  if (!existsSync(adb)) return false;
  const res = spawnSync(adb, ["devices"], { encoding: "utf8", shell: false });
  const lines = (res.stdout || "")
    .split("\n")
    .slice(1)
    .filter((l) => l.trim().endsWith("device"));
  return lines.length > 0;
}

function ensureLocalProperties(androidDir) {
  const props = join(androidDir, "local.properties");
  const escaped = sdk.replace(/\\/g, "\\\\");
  writeFileSync(props, `sdk.dir=${escaped}\n`, "utf8");
}

function copyDebugApk(app) {
  const src = join(
    root,
    "mobile",
    app,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "debug",
    "app-debug.apk"
  );
  const dist = join(root, "mobile", "dist");
  mkdirSync(dist, { recursive: true });
  const dest = join(
    dist,
    app === "portal" ? "MyWiFi-debug-dev.apk" : "Admin.net-debug-dev.apk"
  );
  if (!existsSync(src)) {
    console.error(`APK debug tidak ditemukan: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`\n✓ APK dev: ${dest}`);
}

async function main() {
  const host = detectLanHost();
  const devUrl = `http://${host}:${port}`;
  console.log(`\nCapacitor dev → ${devUrl}`);
  console.log("Pastikan `npm run dev` sudah jalan (bind 0.0.0.0).");
  console.log("Setelah dev, rebuild release: npm run mobile:apk -- --portal-only\n");

  const env = {
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    CAPACITOR_SERVER_URL: devUrl,
  };
  if (javaHome) env.JAVA_HOME = javaHome;

  for (const app of apps) {
    const mobileDir = join(root, "mobile", app);
    const androidDir = join(mobileDir, "android");
    ensureLocalProperties(androidDir);

    if (app === "portal") {
      run("node", ["scripts/generate-portal-www.mjs"], root, env);
    }

    run("npm", ["run", "sync", "--prefix", `mobile/${app}`], root, env);

    const hasDevice = hasAndroidTarget();
    if (!apkOnly && hasDevice) {
      run(
        "npx",
        [
          "cap",
          "run",
          "android",
          "--live-reload",
          "--host",
          host,
          "--port",
          port,
          "--forwardPorts",
          `${port}:${port}`,
          "--no-sync",
        ],
        mobileDir,
        env
      );
      continue;
    }

    console.log(
      hasDevice
        ? "\nBuild APK debug dev (--apk)..."
        : "\nTidak ada device/emulator — build APK debug dev untuk sideload..."
    );
    const gradlew =
      process.platform === "win32"
        ? join(androidDir, "gradlew.bat")
        : join(androidDir, "gradlew");
    run(gradlew, ["assembleDebug"], androidDir, env, {
      shell: process.platform === "win32",
    });
    copyDebugApk(app);
    console.log(`Server dev: ${devUrl}`);
    console.log("HP harus satu WiFi dengan PC, lalu install APK di atas.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
