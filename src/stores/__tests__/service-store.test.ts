import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TAX_RATE_BASIS_POINTS } from "@/config/constants";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { isOrderOpen } from "@/domain/orders/order-state-machine";
import { canPlace } from "@/domain/tables/layout";
import { useServiceStore } from "@/stores/service-store";

const store = () => useServiceStore.getState();
const table = (id: string) => store().tables.find((t) => t.id === id)!;
const order = (id: string) => store().orders.find((o) => o.id === id)!;

beforeEach(() => {
  useServiceStore.setState(useServiceStore.getInitialState(), true);
});

describe("sample floor", () => {
  it("has no overlapping tables, and every open order sits at an occupied table", () => {
    const { tables, orders } = store();
    for (const t of tables) expect(canPlace(tables, t)).toBe(true);
    for (const o of orders.filter((order) => isOrderOpen(order.status))) {
      for (const id of o.tableIds) expect(table(id).status).toBe("occupied");
    }
  });
});

describe("service store", () => {
  it("moves an order: order, old table and new table change together", () => {
    store().moveOrderToTable("order-102", "t5"); // T4 → T5
    expect(order("order-102").tableIds).toEqual(["t5"]);
    expect(table("t4").status).toBe("cleaning");
    expect(table("t5").status).toBe("occupied");
  });

  it("changes nothing when a rule is broken", () => {
    const before = store();
    expect(() => store().moveOrderToTable("order-102", "t3")).toThrow(/Reserved/);
    expect(store().tables).toBe(before.tables);
    expect(store().orders).toBe(before.orders);
  });

  it("joins free tables to an occupied one, and separates them again", () => {
    store().joinTables("t4", ["t5", "t9"]);
    expect(order("order-102").tableIds).toEqual(["t4", "t5", "t9"]);
    expect(table("t9")).toMatchObject({ status: "occupied", mergedIntoId: "t4" });

    store().separateTables("t4");
    expect(order("order-102").tableIds).toEqual(["t4"]);
    expect(table("t9").status).toBe("cleaning");
    expect(table("t9").mergedIntoId).toBeUndefined();
  });

  it("won't free a table that still has an open order", () => {
    expect(() => store().setTableStatus("t4", "cleaning")).toThrow(/order 102 open/);
    store().setTableStatus("t6", "available"); // cleaning done
    expect(table("t6").status).toBe("available");
  });

  it("saves a layout: keeps live statuses, adds new tables as Available", () => {
    const layout = store().tables.map(({ id, name, seats, x, y }) =>
      id === "t1" ? { id, name: "W1", seats, x: 9, y: 6 } : { id, name, seats, x, y },
    );
    store().saveLayout([...layout, { id: "t12", name: "T12", seats: 2, x: 0, y: 0 }]);

    expect(table("t1")).toMatchObject({ name: "W1", x: 9, y: 6, status: "available" });
    expect(table("t4").status).toBe("occupied");
    expect(table("t12").status).toBe("available");
  });

  it("never lets a saved layout change a table's status (regression test)", () => {
    // The editor once leaked "status: available" into its draft, and saving it
    // freed every table, even ones with open orders. This must never happen again.
    const withFakeStatus = store().tables.map((t) => ({
      ...t,
      status: "available" as const,
    }));
    store().saveLayout(withFakeStatus);
    expect(table("t4").status).toBe("occupied");
    expect(table("t3").status).toBe("reserved");
    expect(table("t6").status).toBe("cleaning");
  });
});

describe("service store: placing orders", () => {
  const line = {
    id: "line-1",
    menuItemId: "item-butter-naan",
    name: "Butter Naan",
    unitPricePaise: 6000,
    addOns: [],
    modifiers: [],
    quantity: 2,
    status: "active" as const,
  };

  it("places a dine-in order at a free table: new number, table occupied", () => {
    const order = store().placeOrder({
      type: "dine-in",
      items: [line],
      tableId: "t5",
      createdBy: "staff-1",
    });
    expect(order).toMatchObject({ number: 107, status: "new", tableIds: ["t5"] });
    expect(store().orders.at(-1)?.id).toBe(order.id);
    expect(table("t5").status).toBe("occupied");
  });

  it("places takeaway and delivery orders without a table", () => {
    const takeaway = store().placeOrder({
      type: "takeaway",
      items: [line],
      createdBy: "s",
    });
    const delivery = store().placeOrder({
      type: "delivery",
      items: [line],
      delivery: {
        customerName: "Asha",
        phone: "9876543210",
        address: "12 MG Road, Bengaluru",
      },
      createdBy: "s",
    });
    expect([takeaway.number, delivery.number]).toEqual([107, 108]);
    expect(delivery.tableIds).toEqual([]);
  });

  it("changes nothing when the table can't take the order", () => {
    const before = store();
    expect(() =>
      store().placeOrder({
        type: "dine-in",
        items: [line],
        tableId: "t6",
        createdBy: "s",
      }),
    ).toThrow("T6 is being cleaned.");
    expect(() =>
      store().placeOrder({ type: "dine-in", items: [line], createdBy: "s" }),
    ).toThrow(/Choose a table/);
    expect(store().orders).toBe(before.orders);
    expect(store().tables).toBe(before.tables);
  });
});

describe("service store: changing orders", () => {
  it("moves an order through the kitchen statuses", () => {
    store().setOrderStatus("order-103", "preparing");
    store().setOrderStatus("order-103", "ready");
    expect(order("order-103").statusHistory.map((s) => s.status)).toEqual([
      "new",
      "preparing",
      "ready",
    ]);
    expect(() => store().setOrderStatus("order-103", "new" as never)).toThrow(
      /can't move/,
    );
  });

  it("cancels an order or one item, with a reason", () => {
    store().cancelOrderItem(
      "order-101",
      order("order-101").items[0]!.id,
      "Guest changed mind",
    );
    expect(order("order-101").items[0]?.status).toBe("cancelled");
    store().cancelOrder("order-103", "Guest left");
    expect(order("order-103")).toMatchObject({
      status: "cancelled",
      cancelReason: "Guest left",
    });
  });

  it("adds dishes to an order still in the kitchen", () => {
    const before = order("order-101").items.length;
    store().addItemsToOrder("order-101", [
      { ...order("order-101").items[1]!, id: "extra", quantity: 1 }, // one more Sweet Lassi
    ]);
    expect(order("order-101").items).toHaveLength(before); // combined, not a new line
    expect(order("order-101").items[1]?.quantity).toBe(3);
  });

  it("splits an order: a new order at the same table, numbers continue", () => {
    const naanLine = order("order-102").items.find((i) => i.name === "Garlic Naan")!;
    const created = store().splitOrder("order-102", { [naanLine.id]: 2 });
    expect(created).toMatchObject({
      number: 107,
      tableIds: ["t4"],
      splitFromNumber: 102,
    });
    expect(order("order-102").items.find((i) => i.name === "Garlic Naan")?.quantity).toBe(
      2,
    );
  });

  it("a table with two orders stays occupied when one of them moves away", () => {
    const naanLine = order("order-102").items.find((i) => i.name === "Garlic Naan")!;
    const split = store().splitOrder("order-102", { [naanLine.id]: 1 });
    store().moveOrderToTable(split.id, "t5");
    expect(table("t4").status).toBe("occupied"); // order 102 is still there
    expect(table("t5").status).toBe("occupied");
    store().moveOrderToTable("order-102", "t7");
    expect(table("t4").status).toBe("cleaning"); // now empty
  });

  it("joining tables links every open order at the main table", () => {
    const naanLine = order("order-102").items.find((i) => i.name === "Garlic Naan")!;
    const split = store().splitOrder("order-102", { [naanLine.id]: 1 });
    store().joinTables("t4", ["t5"]);
    expect(order("order-102").tableIds).toEqual(["t4", "t5"]);
    expect(order(split.id).tableIds).toEqual(["t4", "t5"]);
    store().separateTables("t4");
    expect(order(split.id).tableIds).toEqual(["t4"]);
  });
});

describe("billing", () => {
  // Order 102 at T4 is served. Its total, worked out the same way checkout does:
  const totalOf = (id: string) =>
    calculateBill({
      items: order(id).items,
      discount: order(id).discount,
      taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
    }).totalPaise;

  it("settles a served order: paid, payments and invoice saved, table to cleaning", () => {
    const total = totalOf("order-102");
    const invoice = store().settleOrder("order-102", [
      { method: "cash", amountPaise: 50000, tenderedPaise: 50000 },
      { method: "upi", amountPaise: total - 50000 },
    ]);

    expect(order("order-102").status).toBe("paid");
    expect(table("t4").status).toBe("cleaning");
    // The sample day already has INV-1001 to INV-1006, so this one is next.
    expect(invoice).toMatchObject({ number: 1007, where: "T4", totalPaise: total });
    expect(store().invoices.at(-1)).toEqual(invoice);
    const mine = store().payments.filter((p) => p.orderId === "order-102");
    expect(mine.map((p) => [p.method, p.invoiceId])).toEqual([
      ["cash", invoice.id],
      ["upi", invoice.id],
    ]);
  });

  it("changes nothing at all when the payment doesn't add up", () => {
    const before = store();
    expect(() =>
      store().settleOrder("order-102", [{ method: "card", amountPaise: 100 }]),
    ).toThrow(/still left to pay/);
    expect(store()).toBe(before);
  });

  it("won't take payment for an order still in the kitchen", () => {
    expect(() =>
      store().settleOrder("order-101", [{ method: "card", amountPaise: 100 }]),
    ).toThrow("Order 101 is Preparing. Serve it before taking payment.");
  });

  it("applies a discount, and the payment must match the new total", () => {
    const fullTotal = totalOf("order-102");
    store().setDiscount("order-102", { kind: "percent", basisPoints: 1000 });
    const discounted = totalOf("order-102");
    expect(discounted).toBeLessThan(fullTotal);
    expect(() =>
      store().settleOrder("order-102", [{ method: "card", amountPaise: fullTotal }]),
    ).toThrow(/more than what's left to pay/);
    const invoice = store().settleOrder("order-102", [
      { method: "card", amountPaise: discounted },
    ]);
    expect(invoice.discount).toEqual({ kind: "percent", basisPoints: 1000 });
  });

  it("numbers the next invoice after the last one", () => {
    store().settleOrder("order-102", [
      { method: "card", amountPaise: totalOf("order-102") },
    ]);
    store().setOrderStatus("order-105", "served");
    const second = store().settleOrder("order-105", [
      { method: "cash", amountPaise: totalOf("order-105") },
    ]);
    expect(second.number).toBe(1008);
  });
});

describe("sample day", () => {
  it("starts with six bills paid earlier today, each paid in full", () => {
    const { orders, payments, invoices } = store();
    expect(invoices.map((i) => i.number)).toEqual([1001, 1002, 1003, 1004, 1005, 1006]);
    for (const invoice of invoices) {
      expect(orders.find((o) => o.id === invoice.orderId)?.status).toBe("paid");
      const paid = payments
        .filter((p) => invoice.paymentIds.includes(p.id))
        .reduce((sum, p) => sum + p.amountPaise, 0);
      expect(paid).toBe(invoice.totalPaise);
    }
  });
});
