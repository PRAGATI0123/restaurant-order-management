import type { Id } from "./common";

/** The kinds of records the till sends to the restaurant's server. */
export type EntityKind =
  | "order"
  | "table"
  | "invoice"
  | "payment"
  | "menuItem"
  | "category"
  | "addOn"
  | "optionGroup"
  | "settings";

/** One change made on this device, before (or while) it's sent. */
export type SyncChange = {
  kind: EntityKind;
  id: Id;
  /** "upsert" = created or changed (send the whole record); "delete" = removed. */
  op: "upsert" | "delete";
  data?: unknown;
  /** What people call it: "Order 107", "INV-1007", "T6". */
  label: string;
};

/**
 * A change waiting in the OUTBOX. Like an email outbox: the change is already
 * saved on this device (so the till keeps working offline), and it waits here
 * until the server has accepted it.
 */
export type OutboxEntry = SyncChange & {
  /** "order:order_abc": one entry per record; a newer change replaces an older one. */
  key: string;
  queuedAt: number;
  attempts: number;
  /** Don't try again before this time (ms), so a failing server isn't hammered. */
  nextAttemptAt: number;
  /** "pending" = will be sent; "rejected" = the server refused it, a person must look. */
  status: "pending" | "rejected";
  lastError?: string;
};

/** What the (mock) server answered. */
export type SendResult =
  | { ok: true }
  | {
      ok: false;
      /** offline/server: try again later. rejected: the data is wrong, don't retry. */
      kind: "offline" | "server" | "rejected";
      message: string;
    };

/** Demo controls for the pretend network (Sync panel). */
export type NetworkSimulation = {
  /** Pretend the internet is down, even if it isn't. */
  offline: boolean;
  /** Every request takes ~2.5 s instead of ~0.4 s. */
  slow: boolean;
  /** Share of requests that fail with a server error: 0, 0.2, 0.5. */
  failureRate: number;
};
