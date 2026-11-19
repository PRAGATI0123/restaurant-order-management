import type { Id } from "@/types/common";
import type { OutboxEntry, SendResult, SyncChange } from "@/types/sync";

/**
 * THE OUTBOX — how an offline-first till talks to the server
 *
 *  1. Every change is saved on the device FIRST (IndexedDB). The till never
 *     waits for the internet: taking an order or a payment always works.
 *  2. The change is also put in the outbox. When the network is there, the
 *     outbox is sent to the server, oldest first.
 *  3. Only ONE entry per record: if order 107 changes three times while
 *     offline, only its latest version is sent (no stale overwrites).
 *  4. Network or server trouble → try again later, waiting longer each time
 *     (2 s, 4 s, 8 s … up to 1 min), so a struggling server isn't flooded.
 *  5. The server says the data is WRONG (validation) → stop retrying and show
 *     it to a person ("rejected"). Retrying bad data would never succeed.
 */

export const MAX_RETRY_DELAY_MS = 60_000;

/** 1st retry after 2 s, then 4 s, 8 s, 16 s, 32 s, then every 60 s. */
export function retryDelay(attempts: number): number {
  return Math.min(2_000 * 2 ** Math.max(0, attempts - 1), MAX_RETRY_DELAY_MS);
}

export const outboxKey = (change: Pick<SyncChange, "kind" | "id">) =>
  `${change.kind}:${change.id}`;

/**
 * What changed between two versions of a list of records. Stores never edit a
 * record in place (they make a new object), so "a different object" means
 * "changed": a quick check, no deep comparison needed.
 */
export function diffById<T extends { id: Id }>(
  before: readonly T[],
  after: readonly T[],
): { changed: T[]; removed: Id[] } {
  const old = new Map(before.map((record) => [record.id, record]));
  const changed = after.filter((record) => old.get(record.id) !== record);
  const stillThere = new Set(after.map((record) => record.id));
  const removed = before.map((r) => r.id).filter((id) => !stillThere.has(id));
  return { changed, removed };
}

/** Adds a change, REPLACING any older entry for the same record (rule 3). */
export function queueChange(
  outbox: readonly OutboxEntry[],
  change: SyncChange,
  now: number,
): OutboxEntry[] {
  const key = outboxKey(change);
  const entry: OutboxEntry = {
    ...change,
    key,
    queuedAt: now,
    attempts: 0,
    nextAttemptAt: now,
    status: "pending",
  };
  return [...outbox.filter((e) => e.key !== key), entry];
}

/** Entries ready to send now, oldest first. */
export function dueEntries(outbox: readonly OutboxEntry[], now: number): OutboxEntry[] {
  return outbox
    .filter((e) => e.status === "pending" && e.nextAttemptAt <= now)
    .sort((a, b) => a.queuedAt - b.queuedAt);
}

/**
 * The server answered about `sent`. If the record changed again WHILE it was
 * being sent, a newer entry has replaced it: leave that one alone, it still
 * has to go.
 */
export function afterSend(
  outbox: readonly OutboxEntry[],
  sent: OutboxEntry,
  result: SendResult,
  now: number,
): OutboxEntry[] {
  return outbox.flatMap((entry) => {
    if (entry.key !== sent.key || entry.queuedAt !== sent.queuedAt) return [entry];
    if (result.ok) return []; // delivered: out of the outbox
    if (result.kind === "rejected") {
      return [{ ...entry, status: "rejected" as const, lastError: result.message }];
    }
    const attempts = entry.attempts + 1;
    return [
      {
        ...entry,
        attempts,
        nextAttemptAt: now + retryDelay(attempts),
        lastError: result.message,
      },
    ];
  });
}

/** "Sync now" / "Try again": send right away, rejected ones included. */
export function retryAll(outbox: readonly OutboxEntry[], now: number): OutboxEntry[] {
  return outbox.map((e) => ({ ...e, status: "pending" as const, nextAttemptAt: now }));
}

/** Give up on one change (e.g. a rejected one a manager decided to drop). */
export function discardEntry(outbox: readonly OutboxEntry[], key: string): OutboxEntry[] {
  return outbox.filter((e) => e.key !== key);
}

export function outboxSummary(outbox: readonly OutboxEntry[]) {
  return {
    pending: outbox.filter((e) => e.status === "pending").length,
    rejected: outbox.filter((e) => e.status === "rejected").length,
  };
}
