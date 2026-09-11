import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "YTaudio — YouTube Background Audio Player",
    short_name: "YTaudio",
    description:
      "Stream YouTube music with your screen locked. Save data, battery, and enjoy distraction-free high-fidelity sound.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "window-controls-overlay"],
    orientation: "any",
    background_color: "#0a0b0e",
    theme_color: "#0a0b0e",
    categories: ["music", "entertainment", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Trending Music",
        short_name: "Trending",
        url: "/?category=trending%20music",
        description: "Listen to top trending music",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Lofi & Chill Beats",
        short_name: "Lofi",
        url: "/?category=lofi%20hip%20hop%20radio",
        description: "Relax, study, or work to lofi beats",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Podcasts & Talks",
        short_name: "Podcasts",
        url: "/?category=popular%20podcast%20audio",
        description: "Listen to top audio podcasts",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
