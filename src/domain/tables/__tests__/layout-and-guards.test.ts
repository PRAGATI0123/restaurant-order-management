import { describe, expect, it } from "vitest";
import { makeOrder, makeTable } from "@/domain/__tests__/test-data";
import {
  FLOOR_COLUMNS,
  FLOOR_ROWS,
  TABLE_SIZE,
  canPlace,
  findFreeSpot,
  moveTableTo,
} from "@/domain/tables/layout";
import {
  assertCanDeleteTable,
  changeStatusSafely,
  checkStatusChange,
  openOrderAt,
} from "@/domain/tables/table-guards";

describe("table size", () => {
  it("is the same for every table, whatever its seats (2 × 2 cells)", () => {
    expect(TABLE_SIZE).toBe(2);
    // An 8-seat table takes no more room than a 2-seat one:
    const big = makeTable({ id: "big", seats: 8, x: 0, y: 0 });
    expect(canPlace([big], makeTable({ id: "small", seats: 2, x: 2, y: 0 }))).toBe(true);
  });
});

describe("canPlace", () => {
  const t1 = makeTable({ id: "t1", seats: 4, x: 0, y: 0 }); // covers (0..1, 0..1)

  it("allows a free spot right next to another table", () => {
    expect(canPlace([t1], makeTable({ id: "t2", x: 2, y: 0 }))).toBe(true);
  });

  it("refuses any overlap, even one cell", () => {
    expect(canPlace([t1], makeTable({ id: "t2", x: 1, y: 1 }))).toBe(false);
  });

  it("refuses spots that stick out of the room", () => {
    expect(canPlace([], makeTable({ id: "t2", x: FLOOR_COLUMNS - 1, y: 0 }))).toBe(false);
    expect(canPlace([], makeTable({ id: "t2", x: 0, y: FLOOR_ROWS - 1 }))).toBe(false);
    expect(canPlace([], makeTable({ id: "t2", x: -1, y: 0 }))).toBe(false);
  });

  it("ignores the table's own old position", () => {
    expect(canPlace([t1], { ...t1, x: 1 })).toBe(true);
  });
});

describe("findFreeSpot and moveTableTo", () => {
  it("puts a new table in the neat rows first (a 1-cell gap between tables)", () => {
    const t1 = makeTable({ id: "t1", x: 0, y: 0 });
    expect(findFreeSpot([t1])).toEqual({ x: 3, y: 0 });
  });

  it("uses any free gap once the neat rows are full", () => {
    // Fill every neat spot: x = 0, 3, 6, 9 and y = 0, 3, 6 (12 tables).
    const neat = [0, 3, 6].flatMap((y) =>
      [0, 3, 6, 9].map((x) => makeTable({ id: `n${x}-${y}`, x, y })),
    );
    expect(findFreeSpot(neat)).toBeUndefined(); // the 1-cell gaps are too small

    // Someone dragged the last table off the neat spot, from x = 9 to x = 10.
    // No neat spot is free now, but a gap opened up at x = 8:
    const shifted = neat.map((t) => (t.id === "n9-6" ? { ...t, x: 10 } : t));
    expect(findFreeSpot(shifted)).toEqual({ x: 8, y: 5 });
  });

  it("says when the room is full", () => {
    const full = Array.from({ length: (FLOOR_COLUMNS / 2) * (FLOOR_ROWS / 2) }, (_, i) =>
      makeTable({ id: `t${i}`, x: (i % 6) * 2, y: Math.floor(i / 6) * 2 }),
    );
    expect(findFreeSpot(full)).toBeUndefined();
  });

  it("moves a table, or explains why it can't", () => {
    const tables = [
      makeTable({ id: "t1", name: "T1", x: 0, y: 0 }),
      makeTable({ id: "t2", name: "T2", x: 4, y: 0 }),
    ];
    expect(moveTableTo(tables, "t1", 0, 4).find((t) => t.id === "t1")).toMatchObject({
      x: 0,
      y: 4,
    });
    expect(() => moveTableTo(tables, "t1", 3, 0)).toThrow(
      "There's no room for T1 there.",
    );
  });
});

describe("table guards", () => {
  const t4 = makeTable({ id: "t4", name: "T4", status: "occupied" });
  const order = makeOrder({ number: 102, tableIds: ["t4"], status: "served" });

  it("finds the open order at a table, ignoring paid ones", () => {
    expect(openOrderAt(t4, [order])?.number).toBe(102);
    expect(openOrderAt(t4, [{ ...order, status: "paid" }])).toBeUndefined();
  });

  it("won't free a table while its order is open", () => {
    expect(() => changeStatusSafely(t4, "cleaning", [t4], [order])).toThrow(
      "T4 still has order 102 open. Settle the bill or move the order first.",
    );
    expect(
      changeStatusSafely(t4, "cleaning", [t4], [{ ...order, status: "paid" }]).status,
    ).toBe("cleaning");
  });

  it("won't free a main table while others are joined to it", () => {
    const t5 = makeTable({
      id: "t5",
      name: "T5",
      status: "occupied",
      mergedIntoId: "t4",
    });
    expect(checkStatusChange(t4, "cleaning", [t4, t5], [])).toEqual({
      ok: false,
      reason: "T5 is joined to T4. Separate them first.",
    });
  });

  it("still applies the basic table rules", () => {
    const dirty = makeTable({ name: "T6", status: "cleaning" });
    expect(checkStatusChange(dirty, "occupied", [dirty], []).ok).toBe(false);
    expect(checkStatusChange(dirty, "available", [dirty], []).ok).toBe(true);
  });

  it("only lets a free, unjoined table without orders be removed", () => {
    const free = makeTable({ id: "t1", name: "T1" });
    expect(() => assertCanDeleteTable(free, [free], [])).not.toThrow();
    expect(() => assertCanDeleteTable(t4, [t4], [order])).toThrow(/Only a free table/);
    const host = makeTable({ id: "t9", name: "T9" });
    const joined = makeTable({ id: "t8", mergedIntoId: "t9" });
    expect(() => assertCanDeleteTable(host, [host, joined], [])).toThrow(/joined/);
  });
});
