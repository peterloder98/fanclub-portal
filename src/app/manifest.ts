import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anni Perka Fanclub",
    short_name: "Anni Perka Fanclub",
    description: "Digitales Fanclub-Portal für Mitglieder und Vorstand.",
    start_url: "/dashboard",
    display: "standalone",
    display_override: ["standalone", "browser"],
    background_color: "#f4f7fb",
    theme_color: "#143165",
    lang: "de",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/images/fanclub-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/fanclub-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/fanclub-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
