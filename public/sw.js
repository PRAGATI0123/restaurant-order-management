/*
 * THE SERVICE WORKER: lets the till OPEN without internet.
 *
 * IndexedDB keeps the data; this file keeps the app itself (its pages,
 * scripts, styles and fonts) in the browser's cache, so a restart with the
 * Wi-Fi down still opens the POS.
 *
 *  - App files (/_next/static/…, fonts, icons) never change once built (their
 *    names contain a hash), so they're served from the cache first.
 *  - Pages and page data: try the network first (fresh code after a deploy),
 *    and fall back to the cached copy when offline.
 *  - A page never opened before can't be in the cache: a short offline
 *    message explains that, instead of the browser's dinosaur.
 *
 * Bump CACHE when this file's strategy changes; old caches are deleted.
 */
const CACHE = "restaurant-pos-v1";

// Opened once at install, so they work offline even if never visited yet.
const START_PAGES = [
  "/login",
  "/dashboard",
  "/tables",
  "/orders",
  "/orders/new",
  "/kitchen",
  "/menu",
  "/billing",
  "/billing/transactions",
  "/reports",
  "/settings",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // One failing page must not stop the rest from being saved.
      .then((cache) => Promise.allSettled(START_PAGES.map((page) => cache.add(page))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

const isAppFile = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  /\.(?:woff2?|ico|png|svg|webmanifest)$/.test(url.pathname);

const OFFLINE_PAGE = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Offline · Restaurant POS</title>
<body style="font-family:system-ui,sans-serif;background:#f6f1e9;color:#1b2326;display:grid;place-items:center;min-height:100vh;margin:0">
<main style="max-width:28rem;padding:1.5rem;text-align:center">
<h1>You're offline</h1>
<p>This page hasn't been opened on this device before, so it isn't saved yet.
Your orders and payments are safe, and the pages you've used still work.</p>
<p><a href="/dashboard" style="color:#0e6b6e;font-weight:600">Go to the dashboard</a></p>
</main></body></html>`;

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ??
      (await caches.match(request, { ignoreSearch: true }));
    if (cached) return cached;
    if (request.mode === "navigate") {
      return new Response(OFFLINE_PAGE, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only this app's own GET requests; everything else goes straight through.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(isAppFile(url) ? cacheFirst(request) : networkFirst(request));
});
