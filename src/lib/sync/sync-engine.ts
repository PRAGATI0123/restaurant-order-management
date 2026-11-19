"use client";

import type { StoreApi, UseBoundStore } from "zustand";
import { invoiceLabel } from "@/domain/billing/checkout";
import { PAYMENT_METHOD_LABEL } from "@/domain/billing/payments";
import { formatRupees } from "@/domain/money";
import {
  afterSend,
  diffById,
  dueEntries,
  outboxSummary,
  queueChange,
  retryAll,
} from "@/domain/sync/outbox";
import { sendToServer } from "@/mocks/api/mock-server";
import { useMenuStore } from "@/stores/menu-store";
import { useServiceStore } from "@/stores/service-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useSyncStore } from "@/stores/sync-store";
import type { Id } from "@/types/common";
import type { EntityKind, SyncChange } from "@/types/sync";

/**
 * THE SYNC ENGINE (browser only). Started once, after the saved data has loaded.
 *
 *  1. WATCH: it listens to the stores. When a list changes (orders, tables,
 *     payments, menu…) it works out which records changed (diffById) and puts
 *     them in the outbox. No store action had to change for this.
 *  2. SEND: whenever there's something due and the network is up, it sends
 *     the outbox to the (mock) server, one change at a time, oldest first,
 *     applying the outbox rules to each answer (retry later / rejected / done).
 *  3. WAKE UP when the browser comes back online, when the demo network
 *     settings change, and every few seconds for retries that are due.
 */

let started = false;
let sending = false;
const now = () => Date.now();

function queue(changes: SyncChange[]) {
  if (changes.length === 0) return;
  useSyncStore.setState((s) => ({
    outbox: changes.reduce(
      (outbox, change) => queueChange(outbox, change, now()),
      s.outbox,
    ),
  }));
  void sendDue();
}

/** Watches one list in one store and queues every record that changed. */
function watchList<S, T extends { id: Id }>(
  store: UseBoundStore<StoreApi<S>>,
  select: (state: S) => T[],
  kind: EntityKind,
  label: (record: T) => string,
) {
  store.subscribe((state, previous) => {
    const after = select(state);
    const before = select(previous);
    if (after === before) return;
    const { changed, removed } = diffById(before, after);
    const labelOf = new Map(before.map((r) => [r.id, label(r)]));
    queue([
      ...changed.map((r): SyncChange => ({
        kind,
        id: r.id,
        op: "upsert",
        data: r,
        label: label(r),
      })),
      ...removed.map((id): SyncChange => ({
        kind,
        id,
        op: "delete",
        label: labelOf.get(id) ?? id,
      })),
    ]);
  });
}

function watchEverything() {
  watchList(
    useServiceStore,
    (s) => s.orders,
    "order",
    (o) => `Order ${o.number}`,
  );
  watchList(
    useServiceStore,
    (s) => s.tables,
    "table",
    (t) => `Table ${t.name}`,
  );
  watchList(
    useServiceStore,
    (s) => s.invoices,
    "invoice",
    (i) => invoiceLabel(i),
  );
  watchList(
    useServiceStore,
    (s) => s.payments,
    "payment",
    (p) => `${PAYMENT_METHOD_LABEL[p.method]} payment ${formatRupees(p.amountPaise)}`,
  );
  watchList(
    useMenuStore,
    (s) => s.items,
    "menuItem",
    (i) => i.name,
  );
  watchList(
    useMenuStore,
    (s) => s.categories,
    "category",
    (c) => `Category ${c.name}`,
  );
  watchList(
    useMenuStore,
    (s) => s.addOns,
    "addOn",
    (a) => `Add-on ${a.name}`,
  );
  watchList(
    useMenuStore,
    (s) => s.modifierGroups,
    "optionGroup",
    (g) => `Options ${g.name}`,
  );

  // Settings are one record for the whole restaurant.
  useSettingsStore.subscribe((s, prev) => {
    if (
      s.restaurant === prev.restaurant &&
      s.taxRateBasisPoints === prev.taxRateBasisPoints &&
      s.kitchenTiming === prev.kitchenTiming
    ) {
      return;
    }
    const { restaurant, taxRateBasisPoints, kitchenTiming } = s;
    queue([
      {
        kind: "settings",
        id: "restaurant",
        op: "upsert",
        data: { restaurant, taxRateBasisPoints, kitchenTiming },
        label: "Restaurant settings",
      },
    ]);
  });
}

/** Sends everything that's due, one at a time. Safe to call any time. */
export async function sendDue(): Promise<void> {
  if (sending) return;
  sending = true;
  useSyncStore.setState({ syncing: true });
  try {
    for (;;) {
      const { outbox, network, browserOnline } = useSyncStore.getState();
      if (!browserOnline || network.offline) break;
      const next = dueEntries(outbox, now())[0];
      if (!next) break;
      const result = await sendToServer(next, useSyncStore.getState().network);
      useSyncStore.setState((s) => ({
        outbox: afterSend(s.outbox, next, result, now()),
      }));
      if (!result.ok && result.kind === "offline") break; // stop; wait for the network
    }
  } finally {
    sending = false;
    const empty = outboxSummary(useSyncStore.getState().outbox).pending === 0;
    useSyncStore.setState((s) => ({
      syncing: false,
      lastSyncedAt: empty && s.outbox.length === 0 ? now() : s.lastSyncedAt,
    }));
  }
}

/** "Sync now": try everything again straight away, rejected changes included. */
export function syncNow(): void {
  useSyncStore.setState((s) => ({ outbox: retryAll(s.outbox, now()) }));
  void sendDue();
}

export function startSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  watchEverything();

  const updateOnline = () => {
    useSyncStore.setState({ browserOnline: navigator.onLine });
    if (navigator.onLine) void sendDue();
  };
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  // Demo network switched back on → send at once.
  useSyncStore.subscribe((s, prev) => {
    if (s.network !== prev.network) void sendDue();
  });

  // Retries that have become due.
  setInterval(() => void sendDue(), 3_000);
}
