import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orlando 2027",
    short_name: "Orlando 2027",
    description: "A viagem da família a Orlando — 07 a 24 de janeiro de 2027",
    start_url: "/",
    display: "standalone",
    background_color: "#070b26",
    theme_color: "#070b26",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
