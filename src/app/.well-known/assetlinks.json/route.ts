import { MYWIFI_ANDROID_PACKAGE } from "@/lib/mobile/portal-apk-link";

/**
 * Digital Asset Links untuk verifikasi Android App Links (MyWiFi).
 * Set ANDROID_APP_LINK_SHA256 di .env (SHA-256 cert fingerprint release keystore, pisah koma jika banyak).
 */
export async function GET() {
  const raw = process.env.ANDROID_APP_LINK_SHA256?.trim() ?? "";
  const fingerprints = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (fingerprints.length === 0) {
    return Response.json([], {
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: MYWIFI_ANDROID_PACKAGE,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
