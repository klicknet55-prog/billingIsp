import type { MetadataRoute } from "next";
import { getPlatformBrand } from "@/features/platform-settings/service";
import { DEFAULT_BRAND_NAME } from "@/lib/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = DEFAULT_BRAND_NAME;
  let description = "Manajemen ISP & RT-RW Net";
  try {
    const brand = await getPlatformBrand();
    name = brand.name;
    description = brand.tagline;
  } catch {
    // fallback saat DB belum siap
  }

  return {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description,
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
