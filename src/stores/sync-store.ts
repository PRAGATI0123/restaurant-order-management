import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "@/lib/persistence/idb-storage";
import type { NetworkSimulation, OutboxEntry } from "@/types/sync";

type SyncState = {
  /** Changes saved on this device, waiting for the server. */
  outbox: OutboxEntry[];
  /** Demo controls for the pretend network. */
  network: NetworkSimulation;
  /** When the outbox was last completely empty (ms). */
  lastSyncedAt?: number;
  /** Not saved: is a send happening right now? */
  syncing: boolean;
  /** Not saved: does the browser think it's online? */
  browserOnline: boolean;

  setNetwork: (change: Partial<NetworkSimulation>) => void;
};

export const NORMAL_NETWORK: NetworkSimulation = {
  offline: false,
  slow: false,
  failureRate: 0,
};

/**
 * THE SYNC STORE: the outbox and how the network is (pretending to be).
 * The outbox is saved in IndexedDB, so changes made offline are still waiting
 * after the browser is closed, and go out when it's next online.
 * The rules live in domain/sync/outbox.ts; the engine in lib/sync.
 */
export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      outbox: [],
      network: NORMAL_NETWORK,
      lastSyncedAt: undefined,
      syncing: false,
      browserOnline: true,
      setNetwork: (change) => set((s) => ({ network: { ...s.network, ...change } })),
    }),
    persistOptions("pos-sync", (s: SyncState) => ({
      outbox: s.outbox,
      network: s.network,
      lastSyncedAt: s.lastSyncedAt,
    })),
  ),
);
