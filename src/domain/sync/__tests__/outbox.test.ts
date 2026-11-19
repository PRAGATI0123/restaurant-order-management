import { describe, expect, it } from "vitest";
import {
  afterSend,
  diffById,
  discardEntry,
  dueEntries,
  outboxSummary,
  queueChange,
  retryAll,
  retryDelay,
} from "@/domain/sync/outbox";
import type { SyncChange } from "@/types/sync";

const change = (id: string, label = id): SyncChange => ({
  kind: "order",
  id,
  op: "upsert",
  data: { id },
  label,
});

describe("diffById", () => {
  it("finds new, changed and removed records by object identity", () => {
    const a = { id: "a" };
    const b = { id: "b" };
    const c = { id: "c" };
    const bChanged = { id: "b" };
    expect(diffById([a, b, c], [a, bChanged, { id: "d" }])).toEqual({
      changed: [bChanged, { id: "d" }],
      removed: ["c"],
    });
    expect(diffById([a], [a])).toEqual({ changed: [], removed: [] });
  });
});

describe("queueChange", () => {
  it("keeps only the latest change for each record", () => {
    let outbox = queueChange([], change("o1", "v1"), 100);
    outbox = queueChange(outbox, change("o2"), 110);
    outbox = queueChange(outbox, change("o1", "v2"), 120);
    expect(outbox.map((e) => [e.key, e.label])).toEqual([
      ["order:o2", "o2"],
      ["order:o1", "v2"],
    ]);
  });

  it("puts a rejected record back in line when it changes again", () => {
    const rejected = afterSend(
      queueChange([], change("o1"), 0),
      queueChange([], change("o1"), 0)[0]!,
      { ok: false, kind: "rejected", message: "bad" },
      5,
    );
    expect(rejected[0]?.status).toBe("rejected");
    expect(queueChange(rejected, change("o1"), 10)[0]).toMatchObject({
      status: "pending",
      attempts: 0,
    });
  });
});

describe("sending", () => {
  const outbox = queueChange(queueChange([], change("o1"), 100), change("o2"), 200);
  const first = outbox[0]!;

  it("sends the oldest due entries first", () => {
    expect(dueEntries(outbox, 1000).map((e) => e.id)).toEqual(["o1", "o2"]);
  });

  it("removes an entry once the server accepted it", () => {
    expect(afterSend(outbox, first, { ok: true }, 1000).map((e) => e.id)).toEqual(["o2"]);
  });

  it("waits longer after each failure, and isn't due until then", () => {
    const failed = afterSend(
      outbox,
      first,
      { ok: false, kind: "server", message: "503" },
      1000,
    );
    expect(failed[0]).toMatchObject({
      attempts: 1,
      nextAttemptAt: 3000,
      lastError: "503",
    });
    expect(dueEntries(failed, 2999).map((e) => e.id)).toEqual(["o2"]);
    expect(dueEntries(failed, 3000).map((e) => e.id)).toEqual(["o1", "o2"]);
    expect([1, 2, 3, 6, 10].map(retryDelay)).toEqual([2000, 4000, 8000, 60000, 60000]);
  });

  it("stops retrying data the server rejected, and counts it apart", () => {
    const rejected = afterSend(
      outbox,
      first,
      { ok: false, kind: "rejected", message: "Totals don't add up" },
      1000,
    );
    expect(dueEntries(rejected, 99999).map((e) => e.id)).toEqual(["o2"]);
    expect(outboxSummary(rejected)).toEqual({ pending: 1, rejected: 1 });
  });

  it("keeps a newer change that arrived while the old one was being sent", () => {
    const newer = queueChange(outbox, change("o1", "edited"), 500);
    const after = afterSend(newer, first, { ok: true }, 1000);
    expect(after.find((e) => e.id === "o1")?.label).toBe("edited");
  });

  it("'Sync now' makes everything due again; discard drops one entry", () => {
    const failed = afterSend(
      outbox,
      first,
      { ok: false, kind: "rejected", message: "x" },
      1000,
    );
    expect(dueEntries(retryAll(failed, 1000), 1000)).toHaveLength(2);
    expect(discardEntry(failed, "order:o1").map((e) => e.id)).toEqual(["o2"]);
  });
});
