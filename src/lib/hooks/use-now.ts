"use client";

import { useSyncExternalStore } from "react";

/**
 * The current time, for labels like "seated 25 min" or a kitchen timer.
 *
 * Why not just Date.now() while drawing? The server draws the page first and
 * the browser draws it again a moment later. Their clocks give different
 * answers, React sees two different pages, and shows a "hydration" error.
 * useSyncExternalStore solves this: on the server, and on the browser's very
 * first draw, it returns null (so we show nothing); right after, it switches
 * to the real time.
 *
 * One shared timer per speed serves every component that asks: twenty
 * kitchen tickets still use ONE 1-second timer, not twenty. A timer only runs
 * while some component on screen is using it.
 */
type Clock = {
  time: number;
  subscribe: (listener: () => void) => () => void;
  read: () => number;
};

const clocks = new Map<number, Clock>();

function clockFor(intervalMs: number): Clock {
  const existing = clocks.get(intervalMs);
  if (existing) return existing;

  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  const clock: Clock = {
    time: Date.now(),
    subscribe(listener) {
      listeners.add(listener);
      if (!timer) {
        clock.time = Date.now();
        timer = setInterval(() => {
          clock.time = Date.now();
          listeners.forEach((notify) => notify());
        }, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      };
    },
    read: () => clock.time,
  };
  clocks.set(intervalMs, clock);
  return clock;
}

const serverTime = () => null;

/**
 * Milliseconds since 1970 (like Date.now()), or null before the browser takes
 * over. Updates every 30 seconds by default; pass 1000 for a ticking timer.
 */
export function useNow(intervalMs = 30_000): number | null {
  const clock = clockFor(intervalMs);
  return useSyncExternalStore(clock.subscribe, clock.read, serverTime);
}
