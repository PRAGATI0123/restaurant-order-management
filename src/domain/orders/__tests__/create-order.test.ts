import { describe, expect, it } from "vitest";
import { NOW, makeItem, makeOrder, makeTable } from "@/domain/__tests__/test-data";
import { createOrder, nextOrderNumber } from "@/domain/orders/create-order";
import { startOrderAtTable, whyCantStartOrder } from "@/domain/tables/table-guards";
import { normalizePhone, validateDelivery } from "@/lib/validation/order";

const base = {
  id: "order-x",
  number: 104,
  type: "dine-in" as const,
  items: [makeItem()],
  createdBy: "staff-1",
  at: NOW,
};

describe("nextOrderNumber", () => {
  it("starts at 101 and counts up from the highest number", () => {
    expect(nextOrderNumber([])).toBe(101);
    expect(
      nextOrderNumber([makeOrder({ number: 103 }), makeOrder({ number: 101 })]),
    ).toBe(104);
  });
});

describe("createOrder", () => {
  it("creates a 'new' order with its first timeline entry", () => {
    const order = createOrder(base);
    expect(order).toMatchObject({ number: 104, status: "new", tableIds: [] });
    expect(order.statusHistory).toEqual([{ status: "new", at: NOW, by: "staff-1" }]);
  });

  it("refuses an empty order (cancelled lines don't count)", () => {
    expect(() => createOrder({ ...base, items: [] })).toThrow(/at least one item/);
    expect(() =>
      createOrder({ ...base, items: [makeItem({ status: "cancelled" })] }),
    ).toThrow(/at least one item/);
  });

  it("refuses a bad line before it reaches the kitchen", () => {
    expect(() => createOrder({ ...base, items: [makeItem({ quantity: 0 })] })).toThrow(
      /Quantity/,
    );
  });

  it("needs details for delivery, keeps a takeaway name, drops what doesn't belong", () => {
    expect(() => createOrder({ ...base, type: "delivery" })).toThrow(
      /name, phone and address/,
    );
    expect(
      createOrder({ ...base, type: "takeaway", customerName: " Asha " }).customerName,
    ).toBe("Asha");
    expect(createOrder({ ...base, customerName: "Asha" }).customerName).toBeUndefined();
  });
});

describe("startOrderAtTable", () => {
  const order = createOrder(base);

  it("works on a free table, a reserved one, or an occupied one with no order yet", () => {
    for (const status of ["available", "reserved", "occupied"] as const) {
      const table = makeTable({ id: "t5", status });
      const result = startOrderAtTable(order, table, [table], [], NOW);
      expect(result.order.tableIds).toEqual(["t5"]);
      expect(result.table.status).toBe("occupied");
    }
  });

  it("includes the tables joined to it", () => {
    const main = makeTable({ id: "t5", status: "occupied" });
    const joined = makeTable({ id: "t9", status: "occupied", mergedIntoId: "t5" });
    expect(
      startOrderAtTable(order, main, [main, joined], [], NOW).order.tableIds,
    ).toEqual(["t5", "t9"]);
  });

  it("explains why a table can't take the order", () => {
    const t4 = makeTable({ id: "t4", name: "T4", status: "occupied" });
    const open = makeOrder({ number: 102, tableIds: ["t4"] });
    expect(whyCantStartOrder(t4, [t4], [open])).toBe("T4 already has order 102.");
    expect(whyCantStartOrder(makeTable({ name: "T6", status: "cleaning" }), [], [])).toBe(
      "T6 is being cleaned.",
    );
    const main = makeTable({ id: "t5", name: "T5" });
    const t9 = makeTable({ id: "t9", name: "T9", mergedIntoId: "t5" });
    expect(whyCantStartOrder(t9, [main, t9], [])).toBe(
      "T9 is joined to T5. Start the order there.",
    );
    expect(() => startOrderAtTable(order, t4, [t4], [open], NOW)).toThrow(
      /already has order/,
    );
  });

  it("refuses takeaway orders", () => {
    const takeaway = createOrder({ ...base, type: "takeaway" });
    expect(() => startOrderAtTable(takeaway, makeTable(), [], [], NOW)).toThrow(
      /doesn't use a table/,
    );
  });
});

describe("validateDelivery", () => {
  it.each([
    ["98765 43210", "9876543210"],
    ["+91-98765-43210", "9876543210"],
    ["09876543210", "9876543210"],
    ["919876543210", "9876543210"],
  ])("normalizes %s → %s", (typed, clean) => {
    expect(normalizePhone(typed)).toBe(clean);
  });

  it("accepts good details and stores the clean phone", () => {
    expect(
      validateDelivery({
        customerName: "Asha",
        phone: "+91 98765 43210",
        address: "12, MG Road, Indiranagar",
      }),
    ).toEqual({
      ok: true,
      data: {
        customerName: "Asha",
        phone: "9876543210",
        address: "12, MG Road, Indiranagar",
      },
    });
  });

  it("explains every problem", () => {
    expect(
      validateDelivery({ customerName: "", phone: "12345", address: "Home" }),
    ).toEqual({
      ok: false,
      errors: {
        customerName: "Name must be at least 2 characters.",
        phone: "Enter a 10-digit mobile number.",
        address: "Enter the full address (house, street, area).",
      },
    });
    expect(
      validateDelivery({
        customerName: "Asha",
        phone: "5876543210",
        address: "12, MG Road",
      }).ok,
    ).toBe(false); // Indian mobiles start with 6–9
  });
});
