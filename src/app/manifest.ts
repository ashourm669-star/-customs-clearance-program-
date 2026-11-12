import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "العربي للخدمات الجمركية واللوجستية",
    short_name: "العربي جمرك",
    description:
      "منصة إدارة ملفات التخليص الجمركي، الشحنات، المستندات، الفواتير، وتتبع البوالص مع الخطوط الملاحية وشركات الطيران ومنصة نافذة.",
    lang: "ar",
    dir: "rtl",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f2f5f9",
    theme_color: "#0a2239",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "ملفات التخليص", short_name: "الملفات", url: "/shipments" },
      { name: "تتبع بوليصة", short_name: "تتبع", url: "/tracking" },
      { name: "الفواتير", short_name: "الفواتير", url: "/invoices" },
    ],
  };
}
