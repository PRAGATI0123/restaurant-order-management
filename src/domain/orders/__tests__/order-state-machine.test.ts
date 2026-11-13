import { describe, expect, it } from "vitest";
import { NOW, makeItem, makeOrder } from "@/domain/__tests__/test-data";
import { cancelItem } from "@/domain/orders/cancel-item";
import {
  canMoveOrder,
  isOrderOpen,
  moveOrder,
  nextOrderStatuses,
} from "@/domain/orders/order-state-machine";
import type { OrderStatus } from "@/types/order";

const ctx = { at: NOW, by: "staff-1" };
const ALL: OrderStatus[] = ["new", "preparing", "ready", "served", "paid", "cancelled"];

describe("order state machine: which moves are allowed", () => {
  // Every one of the 36 (from → to) pairs, checked against the expected answer.
  const allowed = new Set([
    "new→preparing",
    "new→cancelled",
    "preparing→ready",
    "preparing→cancelled",
    "ready→served",
    "ready→cancelled",
    "served→paid",
  ]);

  for (const from of ALL) {
    for (const to of ALL) {
      const expected = allowed.has(`${from}→${to}`);
      it(`${from} → ${to}: ${expected ? "allowed" : "blocked"}`, () => {
        expect(canMoveOrder(from, to)).toBe(expected);
      });
    }
  }

  it("paid and cancelled are final", () => {
    expect(nextOrderStatuses("paid")).toEqual([]);
    expect(nextOrderStatuses("cancelled")).toEqual([]);
    expect(isOrderOpen("paid")).toBe(false);
    expect(isOrderOpen("cancelled")).toBe(false);
    expect(isOrderOpen("served")).toBe(true);
  });
});

describe("moveOrder", () => {
  it("walks the happy path new → paid and records every step", () => {
    let order = makeOrder();
    for (const status of ["preparing", "ready", "served", "paid"] as const) {
      order = moveOrder(order, status, ctx);
    }

    expect(order.status).toBe("paid");
    expect(order.statusHistory.map((change) => change.status)).toEqual([
      "new",
      "preparing",
      "ready",
      "served",
      "paid",
    ]);
  });

  it("never changes the order it was given", () => {
    const order = makeOrder();
    const moved = moveOrder(order, "preparing", ctx);

    expect(order.status).toBe("new");
    expect(order.statusHistory).toHaveLength(1);
    expect(moved).not.toBe(order);
  });

  it("explains a blocked move in plain words", () => {
    const paid = makeOrder({ status: "paid" });
    expect(() => moveOrder(paid, "preparing", ctx)).toThrow(
      "Order 42 is Paid; it can't move to Preparing.",
    );
  });

  it("won't start preparing an order with no active items", () => {
    const order = makeOrder({ items: [makeItem({ status: "cancelled" })] });
    expect(() => moveOrder(order, "preparing", ctx)).toThrow(/no items to prepare/);
  });

  it("needs a reason to cancel, and stores it", () => {
    const order = makeOrder();
    expect(() => moveOrder(order, "cancelled", ctx)).toThrow(/reason/);
    expect(() => moveOrder(order, "cancelled", ctx, "   ")).toThrow(/reason/);

    const cancelled = moveOrder(order, "cancelled", ctx, " Guest left ");
    expect(cancelled.cancelReason).toBe("Guest left");
  });
});

describe("cancelItem", () => {
  it("marks one item cancelled and keeps the rest", () => {
    const keep = makeItem({ name: "Naan" });
    const drop = makeItem({ name: "Curry" });
    const order = cancelItem(
      makeOrder({ items: [keep, drop] }),
      drop.id,
      "Changed mind",
      ctx,
    );

    expect(order.status).toBe("new");
    expect(order.items.find((i) => i.id === drop.id)).toMatchObject({
      status: "cancelled",
      cancelReason: "Changed mind",
    });
    expect(order.items.find((i) => i.id === keep.id)?.status).toBe("active");
  });

  it("cancels the whole order when the last item goes", () => {
    const only = makeItem();
    const order = cancelItem(makeOrder({ items: [only] }), only.id, "Out of stock", ctx);

    expect(order.status).toBe("cancelled");
    expect(order.cancelReason).toBe("All items were cancelled");
  });

  it("is blocked once the kitchen has finished", () => {
    const item = makeItem();
    const ready = makeOrder({ status: "ready", items: [item] });
    expect(() => cancelItem(ready, item.id, "Too slow", ctx)).toThrow(
      "Items can't be cancelled once order 42 is Ready.",
    );
  });

  it("refuses unknown items, double cancels and missing reasons", () => {
    const item = makeItem({ name: "Lassi" });
    const order = makeOrder({ items: [item, makeItem()] });

    expect(() => cancelItem(order, "nope", "x", ctx)).toThrow(/isn't on order/);
    expect(() => cancelItem(order, item.id, " ", ctx)).toThrow(/reason/);
    const once = cancelItem(order, item.id, "x", ctx);
    expect(() => cancelItem(once, item.id, "x", ctx)).toThrow(
      "Lassi is already cancelled.",
    );
  });
});
