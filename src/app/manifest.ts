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
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
