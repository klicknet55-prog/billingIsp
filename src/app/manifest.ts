import type { MetadataRoute } from "next";
import { DEFAULT_BRAND_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: DEFAULT_BRAND_NAME,
    short_name: DEFAULT_BRAND_NAME,
    description: "Manajemen ISP & RT-RW Net",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon.png", sizes: "64x64", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  };
}
