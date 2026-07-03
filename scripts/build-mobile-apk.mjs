/**
 * Build signed release APK for Admin + Portal (internal distribution).
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
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

const isDebug = process.argv.includes("--debug");

const APK_FILE_NAMES = {
  admin: isDebug ? "Admin.net-debug.apk" : "Admin.net-release.apk",
  portal: isDebug ? "MyWiFi-debug.apk" : "MyWiFi-release.apk",
};

const apps = process.argv.includes("--portal-only")
  ? ["portal"]
  : process.argv.includes("--admin-only")
    ? ["admin"]
    : ["admin", "portal"];

function run(cmd, args, cwd, env = {}, options = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: options.shell ?? true,
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function ensureLocalProperties(androidDir, sdkPath) {
  const props = join(androidDir, "local.properties");
  const escaped = sdkPath.replace(/\\/g, "\\\\");
  writeFileSync(props, `sdk.dir=${escaped}\n`, "utf8");
}

function ensureKeystore(app) {
  const androidDir = join(root, "mobile", app, "android");
  const propsPath = join(androidDir, "keystore.properties");
  const keystorePath = join(androidDir, "netmanage-release.jks");
  const jbr = "C:\\Program Files\\Android\\Android Studio\\jbr";
  const javaHomeLocal = existsSync(jbr) ? jbr : process.env.JAVA_HOME || "";

  if (existsSync(propsPath) && existsSync(keystorePath)) {
    return propsPath;
  }

  mkdirSync(androidDir, { recursive: true });
  const pass = "netmanage2026";
  const dname = "CN=NetManage, OU=Mobile, O=TunnelHost, L=Jakarta, ST=DKI, C=ID";

  console.log(`\nMembuat keystore release untuk ${app}...`);
  const keytool = join(javaHomeLocal, "bin", "keytool.exe");
  if (!existsSync(keytool)) {
    console.error(`keytool tidak ditemukan: ${keytool}`);
    process.exit(1);
  }
  run(
    keytool,
    [
      "-genkeypair",
      "-v",
      "-keystore",
      keystorePath,
      "-alias",
      "netmanage",
      "-keyalg",
      "RSA",
      "-keysize",
      "2048",
      "-validity",
      "10000",
      "-storepass",
      pass,
      "-keypass",
      pass,
      "-dname",
      dname,
    ],
    androidDir,
    {},
    { shell: false }
  );

  writeFileSync(
    propsPath,
    [
      "storePassword=netmanage2026",
      "keyPassword=netmanage2026",
      "keyAlias=netmanage",
      `storeFile=${keystorePath.replace(/\\/g, "/")}`,
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(`Keystore: ${keystorePath}`);
  console.log("Password default: netmanage2026 (ganti untuk produksi Play Store)");
  return propsPath;
}

function copyApk(app) {
  const variant = isDebug ? "debug" : "release";
  const src = join(
    root,
    "mobile",
    app,
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    variant,
    isDebug ? "app-debug.apk" : "app-release.apk"
  );
  const dist = join(root, "mobile", "dist");
  mkdirSync(dist, { recursive: true });
  const dest = join(dist, APK_FILE_NAMES[app]);
  if (!existsSync(src)) {
    console.error(`APK tidak ditemukan: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`\n✓ APK: ${dest}`);
}

async function main() {
  if (!existsSync(sdk)) {
    console.error(`Android SDK tidak ditemukan. Set ANDROID_HOME (${sdk})`);
    process.exit(1);
  }

  const env = {
    ANDROID_HOME: sdk,
    ANDROID_SDK_ROOT: sdk,
    // Release build selalu production — jangan pakai URL dev dari shell sebelumnya.
    CAPACITOR_SERVER_URL: "https://isp.tunnelhost.my.id",
  };
  if (javaHome) env.JAVA_HOME = javaHome;

  if (!process.argv.includes("--skip-assets")) {
    run("npm", ["run", "mobile:assets"], root, env);
    run("npm", ["run", "mobile:assets:generate"], root, env);
  }

  if (apps.includes("portal")) {
    run("node", ["scripts/generate-portal-www.mjs"], root, env);
  }

  for (const app of apps) {
    if (!isDebug) ensureKeystore(app);
    const androidDir = join(root, "mobile", app, "android");
    ensureLocalProperties(androidDir, sdk);
    run("npm", ["run", "sync", "--prefix", `mobile/${app}`], root, env);
    const gradlew =
      process.platform === "win32"
        ? join(androidDir, "gradlew.bat")
        : join(androidDir, "gradlew");

    run(gradlew, [isDebug ? "assembleDebug" : "assembleRelease"], androidDir, env, {
      shell: process.platform === "win32",
    });
    copyApk(app);
  }

  const label = isDebug ? "debug (production server)" : "release";
  console.log(`\nBuild APK ${label} selesai. File ada di mobile/dist/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
