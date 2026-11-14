"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, updated every 30 seconds, for labels like "seated 25 min".
 *
 * Why not just Date.now() while drawing? The server draws the page first and
 * the browser draws it again a moment later. Their clocks give different
 * answers, React sees two different pages, and shows a "hydration" error.
 * useSyncExternalStore solves this: on the server, and on the browser's very
 * first draw, it returns null (so we show nothing); right after, it switches
 * to the real time. One shared timer serves every component that asks.
 */
let currentTime = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    currentTime = Date.now();
    timer = setInterval(() => {
      currentTime = Date.now();
      listeners.forEach((notify) => notify());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => currentTime, // in the browser
    () => null, // on the server and the first browser draw
  );
}
