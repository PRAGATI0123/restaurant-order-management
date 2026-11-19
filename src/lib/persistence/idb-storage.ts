import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { idbDelete, idbGet, idbSet } from "./idb";

/**
 * Lets a Zustand store save itself into IndexedDB (Zustand's `persist`
 * middleware calls these three functions). If saving fails (disk full, a
 * private window that blocks storage), the app keeps working from memory
 * and tells the person once, instead of crashing.
 */
let warned = false;
function warnOnce(error: unknown) {
  if (warned) return;
  warned = true;
  console.warn("Saving on this device failed; changes are kept in memory only.", error);
  void import("sonner").then(({ toast }) =>
    toast.error("Can't save on this device", {
      description: "Changes will be lost when the page is closed. Is storage full?",
    }),
  );
}

const idbStateStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await idbGet<string>(name)) ?? null;
    } catch (error) {
      warnOnce(error);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await idbSet(name, value);
    } catch (error) {
      warnOnce(error);
    }
  },
  removeItem: async (name) => {
    try {
      await idbDelete(name);
    } catch (error) {
      warnOnce(error);
    }
  },
};

/**
 * The options every saved store shares:
 *  - name: its key in the database ("pos-service", "pos-menu", …)
 *  - skipHydration: don't read the saved data on the server, or straight away
 *    on load; loadSavedData() reads ALL stores once the page is in the browser,
 *    and AuthGate shows a loading screen until they're back.
 *  - version + migrate: when the saved shape changes, bump the version and
 *    say how to upgrade data saved by an older version (instead of losing it).
 */
export function persistOptions<S, P>(
  name: string,
  partialize: (state: S) => P,
  upgrade?: { version: number; migrate: (saved: unknown, fromVersion: number) => P },
) {
  return {
    name,
    version: upgrade?.version ?? 1,
    storage: createJSONStorage<P>(() => idbStateStorage),
    partialize,
    skipHydration: true,
    ...(upgrade ? { migrate: upgrade.migrate } : {}),
  };
}
