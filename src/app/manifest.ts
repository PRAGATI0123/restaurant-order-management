import type { MetadataRoute } from "next";

/**
 * The web app manifest: lets the POS be added to a tablet's home screen and
 * open full-screen like an app (no browser address bar), in the theme colours.
 * Next.js serves it at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Restaurant POS",
    short_name: "POS",
    description: "Touchscreen POS and table management for restaurants",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f1e9",
    theme_color: "#0e6b6e",
    // Generated from the logo component by app/icon.tsx (no image files).
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
