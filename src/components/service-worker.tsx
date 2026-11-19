"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js, which keeps the app's own files cached so the POS
 * opens without internet (see that file).
 *
 * Production only. In development (`next dev`) code changes every few
 * seconds and a cache would serve old code, so any worker left over from a
 * production run is removed instead.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => console.warn("Offline support couldn't start.", error));
    } else {
      void navigator.serviceWorker
        .getRegistrations()
        .then((all) => all.forEach((registration) => void registration.unregister()));
    }
  }, []);
  return null;
}
