import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Hide the round "N" development badge: it sat on top of the sidebar's
  // "Log out" button. Dev-only; Next.js still shows build and runtime errors.
  devIndicators: false,
  // The service worker must never be cached by the browser, or a new version
  // of the app would take days to reach the tills (Next.js PWA guide).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  experimental: {
    instantInsights: {
      // This POS draws its pages in the browser, from data on the device and a
      // login only the browser knows (sessionStorage). The server can't draw a
      // logged-in page, so Next.js's dev-time "instant navigation" check would
      // flag every page as "dropped". Validate only pages that opt in with
      // `export const instant = true` (none yet). Dev-only: builds unaffected.
      // See node_modules/next/dist/docs/.../route-segment-config/instant.md
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    // Pin the project root. Without this, Next.js sees the extra package-lock.json
    // on the Desktop and wrongly treats the Desktop as the project root.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
