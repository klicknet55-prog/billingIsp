/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3", "node-routeros"],
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
