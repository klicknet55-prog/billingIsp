/**
 * Generate launcher + splash source assets for NetManage Admin & Portal APK.
 * Output: mobile/{admin,portal}/assets/*.png → run @capacitor/assets generate.
 */
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoPath = join(root, "public", "icon.png");

const SIZE = 1024;
const SPLASH = 2732;

/** @type {Array<{ id: "admin" | "portal"; title: string; subtitle: string; bg: string; badge: string; badgeColor: string }>} */
const variants = [
  {
    id: "admin",
    title: "Admin.net",
    subtitle: "",
    bg: "#1e40af",
    badge: "ADM",
    badgeColor: "#f59e0b",
  },
  {
    id: "portal",
    title: "MyWiFi",
    subtitle: "",
    bg: "#2563eb",
    badge: "WiFi",
    badgeColor: "#34d399",
  },
];

function badgeSvg(label, color) {
  const w = 220;
  const h = 72;
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="18" fill="${color}" stroke="#ffffff" stroke-width="4"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Segoe UI, system-ui, sans-serif" font-size="32" font-weight="700" fill="#ffffff">${label}</text>
</svg>`);
}

function splashTitleSvg(title, subtitle) {
  const subline = subtitle
    ? `<text x="600" y="220" text-anchor="middle"
    font-family="Segoe UI, system-ui, sans-serif" font-size="64" font-weight="500" fill="#dbeafe">${subtitle}</text>`
    : "";
  return Buffer.from(`<svg width="1200" height="280" xmlns="http://www.w3.org/2000/svg">
  <text x="600" y="${subtitle ? 110 : 140}" text-anchor="middle"
    font-family="Segoe UI, system-ui, sans-serif" font-size="96" font-weight="700" fill="#ffffff">${title}</text>
  ${subline}
</svg>`);
}

async function buildIconOnly(variant) {
  const logoSize = Math.round(SIZE * 0.56);
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: "contain" })
    .png()
    .toBuffer();

  const left = Math.round((SIZE - logoSize) / 2);
  const top = Math.round((SIZE - logoSize) / 2 - 36);

  return sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: variant.bg,
    },
  })
    .composite([
      { input: logo, left, top },
      { input: badgeSvg(variant.badge, variant.badgeColor), left: SIZE - 248, top: SIZE - 248 },
    ])
    .png();
}

async function buildForeground(variant) {
  const logoSize = Math.round(SIZE * 0.62);
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: "contain" })
    .png()
    .toBuffer();

  const left = Math.round((SIZE - logoSize) / 2);
  const top = Math.round((SIZE - logoSize) / 2 - 20);

  return sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([
    { input: logo, left, top },
    { input: badgeSvg(variant.badge, variant.badgeColor), left: SIZE - 248, top: SIZE - 248 },
  ]);
}

async function buildBackground(variant) {
  return sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: variant.bg,
    },
  });
}

async function buildSplash(variant) {
  const logoSize = Math.round(SPLASH * 0.22);
  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: "contain" })
    .png()
    .toBuffer();

  const logoLeft = Math.round((SPLASH - logoSize) / 2);
  const logoTop = Math.round(SPLASH * 0.34);

  return sharp({
    create: {
      width: SPLASH,
      height: SPLASH,
      channels: 4,
      background: variant.bg,
    },
  }).composite([
    { input: logo, left: logoLeft, top: logoTop },
    {
      input: splashTitleSvg(variant.title, variant.subtitle),
      left: Math.round((SPLASH - 1200) / 2),
      top: logoTop + logoSize + 48,
    },
  ]);
}

async function writeVariant(variant) {
  const outDir = join(root, "mobile", variant.id, "assets");
  mkdirSync(outDir, { recursive: true });

  await (await buildIconOnly(variant)).toFile(join(outDir, "icon-only.png"));
  await (await buildForeground(variant)).png().toFile(join(outDir, "icon-foreground.png"));
  await (await buildBackground(variant)).png().toFile(join(outDir, "icon-background.png"));
  await (await buildSplash(variant)).png().toFile(join(outDir, "splash.png"));

  console.log(`✓ ${variant.id}: ${outDir}`);
}

async function main() {
  if (!existsSync(logoPath)) {
    console.error(`Logo tidak ditemukan: ${logoPath}`);
    process.exit(1);
  }

  for (const variant of variants) {
    await writeVariant(variant);
  }

  console.log("\nSelesai. Jalankan: npm run mobile:assets:generate");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
