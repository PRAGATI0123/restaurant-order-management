"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import { useServiceStore } from "@/stores/service-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useSyncStore } from "@/stores/sync-store";

/** Every store that is saved on this device. */
const SAVED_STORES = [
  useServiceStore,
  useMenuStore,
  useSettingsStore,
  useCartStore,
  useSyncStore,
];

type LoadState = "idle" | "loading" | "ready";

let state: LoadState = "idle";
const listeners = new Set<() => void>();
/** Runs once everything is loaded (e.g. to start syncing). */
const onReady: (() => void)[] = [];

function setState(next: LoadState) {
  state = next;
  listeners.forEach((notify) => notify());
}

/**
 * Reads every saved store back from IndexedDB, ONCE per page load. Until then
 * the stores hold the sample data; a store with nothing saved yet (first
 * visit) simply keeps it. Reading all of them together means no screen ever
 * shows saved orders next to sample tables.
 */
export async function loadSavedData(): Promise<void> {
  if (state !== "idle") return;
  setState("loading");
  await Promise.all(SAVED_STORES.map((store) => store.persist.rehydrate()));
  setState("ready");
  onReady.splice(0).forEach((run) => run());
}

/** Run `task` once the saved data is loaded (now, if it already is). */
export function whenDataLoaded(task: () => void): void {
  if (state === "ready") task();
  else onReady.push(task);
}

/**
 * True once the saved data is back. False on the server and on the browser's
 * first draw, so both draw the same loading screen (no hydration error).
 */
export function useDataReady(): boolean {
  const ready = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => state === "ready",
    () => false,
  );
  useEffect(() => {
    void loadSavedData();
  }, []);
  return ready;
}
