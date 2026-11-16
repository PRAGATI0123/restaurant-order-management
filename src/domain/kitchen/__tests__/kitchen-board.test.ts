import { describe, expect, it } from "vitest";
import { NOW, makeItem, makeOrder } from "@/domain/__tests__/test-data";
import {
  KITCHEN_NEXT,
  allDayCounts,
  buildKitchenBoard,
  enteredStatusAt,
  kitchenSummary,
  ticketClockStart,
} from "@/domain/kitchen/kitchen-board";
import { canMoveOrder } from "@/domain/orders/order-state-machine";
import type { OrderStatus } from "@/types/order";

/** An ISO time `minutes` before the fixed test NOW. */
const minutesBefore = (minutes: number) =>
  new Date(Date.parse(NOW) - minutes * 60_000).toISOString();

/** An order placed `placed` minutes ago, now in `status` since `since` minutes ago. */
function ticket(number: number, status: OrderStatus, placed: number, since = placed) {
  return makeOrder({
    number,
    status,
    createdAt: minutesBefore(placed),
    statusHistory: [
      { status: "new", at: minutesBefore(placed), by: "staff-1" },
      ...(status === "new" ? [] : [{ status, at: minutesBefore(since), by: "staff-1" }]),
    ],
  });
}

describe("one-tap moves", () => {
  it("only ever moves a ticket one step forward, as the order rules allow", () => {
    for (const [from, to] of Object.entries(KITCHEN_NEXT)) {
      expect(canMoveOrder(from as OrderStatus, to)).toBe(true);
    }
  });
});

describe("ticket clocks", () => {
  it("New and Preparing count from when the order was placed", () => {
    const cooking = ticket(1, "preparing", 12, 4);
    expect(ticketClockStart(cooking)).toBe(minutesBefore(12));
  });

  it("Ready counts from when the food became ready", () => {
    const ready = ticket(2, "ready", 20, 3);
    expect(enteredStatusAt(ready)).toBe(minutesBefore(3));
    expect(ticketClockStart(ready)).toBe(minutesBefore(3));
  });

  it("falls back to the time it was placed if the timeline is missing", () => {
    const odd = { ...ticket(3, "ready", 9), statusHistory: [] };
    expect(ticketClockStart(odd)).toBe(minutesBefore(9));
  });
});

describe("buildKitchenBoard", () => {
  it("puts each open ticket in its column, oldest first", () => {
    const board = buildKitchenBoard([
      ticket(5, "new", 2),
      ticket(4, "new", 8),
      ticket(6, "preparing", 15, 10),
      ticket(7, "ready", 30, 1),
      ticket(8, "ready", 10, 6),
    ]);
    expect(board.new.map((o) => o.number)).toEqual([4, 5]);
    expect(board.preparing.map((o) => o.number)).toEqual([6]);
    // Ready: 8 has waited at the pass longer (6 min vs 1 min), even though 7 is older.
    expect(board.ready.map((o) => o.number)).toEqual([8, 7]);
  });

  it("leaves served, paid and cancelled orders off the board", () => {
    const board = buildKitchenBoard([
      ticket(1, "served", 20),
      ticket(2, "paid", 40),
      ticket(3, "cancelled", 5),
    ]);
    expect(board).toEqual({ new: [], preparing: [], ready: [] });
  });

  it("uses the order number when two tickets came in at the same moment", () => {
    const board = buildKitchenBoard([ticket(12, "new", 5), ticket(11, "new", 5)]);
    expect(board.new.map((o) => o.number)).toEqual([11, 12]);
  });
});

describe("allDayCounts", () => {
  const naan = (quantity: number) =>
    makeItem({ menuItemId: "naan", name: "Garlic Naan", quantity });

  it("adds up each dish across every ticket still to cook", () => {
    const orders = [
      makeOrder({ status: "new", items: [naan(2)] }),
      makeOrder({ status: "preparing", items: [naan(4)] }),
    ];
    expect(allDayCounts(orders)).toEqual([
      { key: "naan:", name: "Garlic Naan", quantity: 6 },
    ]);
  });

  it("skips cancelled lines and tickets that are already cooked", () => {
    const orders = [
      makeOrder({ status: "new", items: [{ ...naan(3), status: "cancelled" }] }),
      makeOrder({ status: "ready", items: [naan(5)] }),
      makeOrder({ status: "served", items: [naan(1)] }),
    ];
    expect(allDayCounts(orders)).toEqual([]);
  });

  it("counts sizes separately, most first, then by name", () => {
    const biryani = (size: string, quantity: number) =>
      makeItem({
        menuItemId: "biryani",
        name: "Biryani",
        variant: { id: size, name: size },
        quantity,
      });
    const orders = [
      makeOrder({
        status: "new",
        items: [biryani("Half", 1), biryani("Full", 1), naan(3)],
      }),
    ];
    expect(allDayCounts(orders).map((l) => `${l.quantity} × ${l.name}`)).toEqual([
      "3 × Garlic Naan",
      "1 × Biryani (Full)",
      "1 × Biryani (Half)",
    ]);
  });
});

describe("kitchenSummary", () => {
  it("counts tickets to cook, the late ones, and food waiting at the pass", () => {
    const board = buildKitchenBoard([
      ticket(1, "new", 2), // on time
      ticket(2, "preparing", 11, 5), // warning (10+ min)
      ticket(3, "preparing", 16, 9), // late (15+ min)
      ticket(4, "ready", 40, 2), // ready: never "late" here
    ]);
    expect(kitchenSummary(board, new Date(NOW))).toEqual({
      toCook: 3,
      warning: 1,
      late: 1,
      ready: 1,
    });
  });
});
