/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3", "node-routeros"],
  // Capaitor plugins harus di-transpile agar bridge WebView remote (APK) jalan
  transpilePackages: [
    "@capacitor/core",
    "@capacitor/app",
    "@capacitor/browser",
    "@capacitor/filesystem",
    "@capacitor/share",
  ],
  devIndicators: false,
  experimental: {
    serverActions: {
      // APK upload (saveApkUpload) allows up to 80 MB; multipart adds small overhead.
      bodySizeLimit: "85mb",
    },
  },
  async redirects() {
    return [
      { source: "/isp", destination: "/dashboard", permanent: true },
      { source: "/isp/:path*", destination: "/dashboard/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/dashboard", destination: "/isp" },
      { source: "/dashboard/:path*", destination: "/isp/:path*" },
    ];
  },
};

export default nextConfig;
