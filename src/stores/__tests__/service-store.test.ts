import { beforeEach, describe, expect, it } from "vitest";
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
    for (const o of orders) {
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
    const layout = store().tables.map(({ id, name, seats, shape, x, y }) =>
      id === "t1"
        ? { id, name: "W1", seats, shape, x: 2, y: 4 }
        : { id, name, seats, shape, x, y },
    );
    store().saveLayout([
      ...layout,
      { id: "t12", name: "T12", seats: 2, shape: "round", x: 10, y: 6 },
    ]);

    expect(table("t1")).toMatchObject({ name: "W1", x: 2, y: 4, status: "available" });
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
    expect(order).toMatchObject({ number: 104, status: "new", tableIds: ["t5"] });
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
    expect([takeaway.number, delivery.number]).toEqual([104, 105]);
    expect(delivery.tableIds).toEqual([]);
  });

  it("changes nothing when the table can't take the order", () => {
    const before = store();
    expect(() =>
      store().placeOrder({
        type: "dine-in",
        items: [line],
        tableId: "t4",
        createdBy: "s",
      }),
    ).toThrow("T4 already has order 102.");
    expect(() =>
      store().placeOrder({ type: "dine-in", items: [line], createdBy: "s" }),
    ).toThrow(/Choose a table/);
    expect(store().orders).toBe(before.orders);
    expect(store().tables).toBe(before.tables);
  });
});
