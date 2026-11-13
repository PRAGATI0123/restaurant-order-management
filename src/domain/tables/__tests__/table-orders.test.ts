import { describe, expect, it } from "vitest";
import { NOW, makeOrder, makeTable } from "@/domain/__tests__/test-data";
import {
  mergeTables,
  seatOrder,
  totalSeats,
  transferOrder,
  unmergeTables,
} from "@/domain/tables/table-orders";

describe("seatOrder", () => {
  it("puts the order at a free table and marks it occupied", () => {
    const t1 = makeTable({ id: "t1" });
    const result = seatOrder(makeOrder(), t1, NOW);

    expect(result.order.tableIds).toEqual(["t1"]);
    expect(result.table.status).toBe("occupied");
  });

  it("works for a reserved table whose guests arrived", () => {
    const booked = makeTable({ status: "reserved" });
    expect(seatOrder(makeOrder(), booked, NOW).table.status).toBe("occupied");
  });

  it("refuses busy or dirty tables", () => {
    expect(() =>
      seatOrder(makeOrder(), makeTable({ name: "T2", status: "occupied" }), NOW),
    ).toThrow("T2 is Occupied. Choose a free or reserved table.");
    expect(() =>
      seatOrder(makeOrder(), makeTable({ name: "T3", status: "cleaning" }), NOW),
    ).toThrow("T3 is Cleaning. Choose a free or reserved table.");
  });

  it("refuses takeaway orders and orders that already have a table", () => {
    expect(() => seatOrder(makeOrder({ type: "takeaway" }), makeTable(), NOW)).toThrow(
      /only dine-in orders use tables/,
    );
    expect(() => seatOrder(makeOrder({ tableIds: ["t9"] }), makeTable(), NOW)).toThrow(
      /Transfer it instead/,
    );
  });
});

describe("transferOrder", () => {
  const t1 = makeTable({ id: "t1", name: "T1", status: "occupied" });
  const t2 = makeTable({ id: "t2", name: "T2" });

  it("moves the order; the old table needs cleaning, the new one is occupied", () => {
    const order = makeOrder({ tableIds: ["t1"], status: "preparing" });
    const result = transferOrder(order, t1, t2, NOW);

    expect(result.order.tableIds).toEqual(["t2"]);
    expect(result.from.status).toBe("cleaning");
    expect(result.to.status).toBe("occupied");
    expect(order.tableIds).toEqual(["t1"]); // original untouched
  });

  it("refuses a table that isn't free", () => {
    const order = makeOrder({ tableIds: ["t1"] });
    const busy = makeTable({ name: "T3", status: "reserved" });
    expect(() => transferOrder(order, t1, busy, NOW)).toThrow(
      "T3 is Reserved. Only a free table can take this order.",
    );
  });

  it("refuses when the order isn't at the 'from' table, or from = to", () => {
    expect(() => transferOrder(makeOrder({ tableIds: ["t9"] }), t1, t2, NOW)).toThrow(
      "Order 42 isn't at T1.",
    );
    expect(() => transferOrder(makeOrder({ tableIds: ["t1"] }), t1, t1, NOW)).toThrow(
      /already at T1/,
    );
  });

  it("refuses paid orders and orders on joined tables", () => {
    expect(() =>
      transferOrder(makeOrder({ tableIds: ["t1"], status: "paid" }), t1, t2, NOW),
    ).toThrow("Order 42 is Paid; its table can't change.");
    expect(() =>
      transferOrder(makeOrder({ tableIds: ["t1", "t5"] }), t1, t2, NOW),
    ).toThrow(/Unmerge them/);
  });
});

describe("mergeTables and unmergeTables", () => {
  const main = makeTable({ id: "t4", name: "T4", status: "occupied", seats: 4 });
  const t5 = makeTable({ id: "t5", name: "T5", seats: 4 });
  const t6 = makeTable({ id: "t6", name: "T6", seats: 2 });

  it("joins free tables to the main one and adds them to its order", () => {
    const order = makeOrder({ tableIds: ["t4"] });
    const result = mergeTables(main, [t5, t6], order, NOW);

    expect(result.joined.map((t) => t.mergedIntoId)).toEqual(["t4", "t4"]);
    expect(result.joined.every((t) => t.status === "occupied")).toBe(true);
    expect(result.order?.tableIds).toEqual(["t4", "t5", "t6"]);
    expect(totalSeats(result.main, result.joined)).toBe(10);
  });

  it("can join tables before any order exists (big group just arrived)", () => {
    const freeMain = makeTable({ id: "t1" });
    const result = mergeTables(freeMain, [t5], undefined, NOW);
    expect(result.main.status).toBe("occupied");
    expect(result.order).toBeUndefined();
  });

  it("refuses busy tables, the same table twice, or a table joined to itself", () => {
    const busy = makeTable({ name: "T7", status: "occupied" });
    expect(() => mergeTables(main, [busy], undefined, NOW)).toThrow(
      "T7 is Occupied. Only a free table can be joined.",
    );
    expect(() => mergeTables(main, [t5, t5], undefined, NOW)).toThrow(/twice/);
    expect(() => mergeTables(main, [main], undefined, NOW)).toThrow(/itself/);
    expect(() => mergeTables(main, [], undefined, NOW)).toThrow(/at least one/);
  });

  it("refuses a main table that is being cleaned", () => {
    const dirty = makeTable({ name: "T1", status: "cleaning" });
    expect(() => mergeTables(dirty, [t5], undefined, NOW)).toThrow(/Cleaning/);
  });

  it("unmerges: joined tables go to cleaning and leave the order", () => {
    const merged = mergeTables(main, [t5, t6], makeOrder({ tableIds: ["t4"] }), NOW);
    const result = unmergeTables(merged.main, merged.joined, merged.order, NOW);

    expect(result.separated.map((t) => t.status)).toEqual(["cleaning", "cleaning"]);
    expect(result.separated.every((t) => t.mergedIntoId === undefined)).toBe(true);
    expect(result.order?.tableIds).toEqual(["t4"]);
  });

  it("refuses to unmerge a table that isn't joined to this main table", () => {
    expect(() => unmergeTables(main, [t5], undefined, NOW)).toThrow(
      "T5 isn't joined to T4.",
    );
  });
});
