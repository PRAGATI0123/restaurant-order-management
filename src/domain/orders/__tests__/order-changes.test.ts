import { describe, expect, it } from "vitest";
import { NOW, makeItem, makeOrder } from "@/domain/__tests__/test-data";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { addItemsToOrder, canAddItems, splitOrder } from "@/domain/orders/order-changes";
import {
  DEFAULT_ORDER_FILTERS,
  countOrders,
  filterOrders,
} from "@/domain/orders/order-filters";

const naan = (quantity: number, id = "naan") =>
  makeItem({
    id,
    menuItemId: "item-butter-naan",
    name: "Butter Naan",
    unitPricePaise: 6000,
    quantity,
  });
const dal = () =>
  makeItem({
    id: "dal",
    menuItemId: "item-dal",
    name: "Dal Makhani",
    unitPricePaise: 28000,
  });
const target = { id: "order-new", number: 107, at: NOW };

describe("addItemsToOrder", () => {
  it("adds dishes while the kitchen is still on it, combining same dishes", () => {
    const order = makeOrder({ status: "preparing", items: [naan(2)] });
    const updated = addItemsToOrder(order, [naan(1, "other-naan"), dal()], NOW);
    expect(updated.items.map((i) => `${i.quantity} × ${i.name}`)).toEqual([
      "3 × Butter Naan",
      "1 × Dal Makhani",
    ]);
  });

  it("keeps cancelled lines (history) but never merges into them", () => {
    const order = makeOrder({
      items: [naan(1, "a"), { ...naan(1, "b"), status: "cancelled" }],
    });
    const updated = addItemsToOrder(order, [naan(1, "c")], NOW);
    expect(updated.items.map((i) => `${i.status}:${i.quantity}`)).toEqual([
      "active:2",
      "cancelled:1",
    ]);
  });

  it("refuses once the order is Ready or Served", () => {
    for (const status of ["ready", "served", "paid"] as const) {
      expect(canAddItems(makeOrder({ status }))).toBe(false);
    }
    expect(() => addItemsToOrder(makeOrder({ status: "served" }), [dal()], NOW)).toThrow(
      "Order 42 is Served. Start a new order for more dishes.",
    );
  });
});

describe("splitOrder", () => {
  const order = makeOrder({
    status: "served",
    tableIds: ["t4"],
    items: [naan(4), dal()],
    discount: { kind: "percent", basisPoints: 1000 },
  });

  it("moves part of a quantity into a new order at the same table", () => {
    const { original, created } = splitOrder(order, { naan: 1 }, target);
    expect(original.items.map((i) => `${i.quantity} × ${i.name}`)).toEqual([
      "3 × Butter Naan",
      "1 × Dal Makhani",
    ]);
    expect(created).toMatchObject({
      id: "order-new",
      number: 107,
      status: "served",
      tableIds: ["t4"],
      splitFromNumber: 42,
    });
    expect(created.items.map((i) => `${i.quantity} × ${i.name}`)).toEqual([
      "1 × Butter Naan",
    ]);
    expect(created.discount).toBeUndefined(); // the discount stays on the original
  });

  it("nothing is lost: both orders together cost the same as before (no discount)", () => {
    const plain = { ...order, discount: undefined };
    const { original, created } = splitOrder(plain, { naan: 3, dal: 1 }, target);
    const total = (o: typeof order) =>
      calculateBill({ items: o.items, taxRateBasisPoints: 0 }).subtotalPaise;
    expect(total(original) + total(created)).toBe(total(plain));
  });

  it("refuses to move nothing, everything, or too many", () => {
    expect(() => splitOrder(order, {}, target)).toThrow(/at least one dish to move/);
    expect(() => splitOrder(order, { naan: 4, dal: 1 }, target)).toThrow(
      "Leave at least one dish on order 42.",
    );
    expect(() => splitOrder(order, { naan: 5 }, target)).toThrow(
      "You can move 1 to 4 × Butter Naan.",
    );
    expect(() => splitOrder(order, { ghost: 1 }, target)).toThrow(/isn't on this order/);
  });

  it("refuses paid or cancelled orders", () => {
    expect(() => splitOrder({ ...order, status: "paid" }, { naan: 1 }, target)).toThrow(
      "Order 42 is Paid; it can't be split.",
    );
  });
});

describe("filterOrders and countOrders", () => {
  const orders = [
    makeOrder({
      id: "a",
      number: 101,
      status: "preparing",
      createdAt: "2026-11-16T10:00:00Z",
    }),
    makeOrder({
      id: "b",
      number: 102,
      status: "paid",
      createdAt: "2026-11-16T11:00:00Z",
    }),
    makeOrder({
      id: "c",
      number: 103,
      status: "new",
      type: "takeaway",
      customerName: "Asha",
      createdAt: "2026-11-16T12:00:00Z",
    }),
  ];
  const text = (o: (typeof orders)[number]) => o.customerName ?? "T4";
  const numbers = (f: Partial<typeof DEFAULT_ORDER_FILTERS>) =>
    filterOrders(orders, { ...DEFAULT_ORDER_FILTERS, ...f }, text).map((o) => o.number);

  it("shows open orders by default, newest first", () => {
    expect(numbers({})).toEqual([103, 101]);
    expect(numbers({ status: "all" })).toEqual([103, 102, 101]);
    expect(numbers({ status: "paid" })).toEqual([102]);
  });

  it("filters by type and searches number, table and customer", () => {
    expect(numbers({ type: "takeaway" })).toEqual([103]);
    expect(numbers({ status: "all", query: "#102" })).toEqual([102]);
    expect(numbers({ query: "asha" })).toEqual([103]);
    expect(numbers({ query: "t4" })).toEqual([101]);
  });

  it("counts per status, and open ones", () => {
    expect(countOrders(orders)).toMatchObject({
      open: 2,
      all: 3,
      new: 1,
      preparing: 1,
      paid: 1,
    });
  });
});
