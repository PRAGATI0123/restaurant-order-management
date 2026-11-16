import { describe, expect, it } from "vitest";
import {
  NOW,
  makeItem,
  makeOrder,
  makeTable,
  option,
} from "@/domain/__tests__/test-data";
import {
  invoiceLabel,
  nextInvoiceNumber,
  setOrderDiscount,
  settleOrder,
  type SettleInput,
} from "@/domain/billing/checkout";
import { tablesToFreeAfter } from "@/domain/tables/table-guards";

let counter = 0;
const newId = (prefix: string) => `${prefix}-${++counter}`;

// ₹200 paneer (+ ₹30 cheese) × 2 and ₹100 lassi: subtotal ₹560, 5% GST ₹28, total ₹588.
const servedOrder = makeOrder({
  id: "o1",
  number: 101,
  status: "served",
  tableIds: ["t4"],
  items: [
    makeItem({
      id: "paneer",
      name: "Paneer Tikka",
      unitPricePaise: 20000,
      quantity: 2,
      variant: { id: "v-half", name: "Half" },
      addOns: [option("Extra cheese", 3000)],
    }),
    makeItem({ id: "lassi", name: "Sweet Lassi", unitPricePaise: 10000 }),
    makeItem({ id: "soup", name: "Soup", unitPricePaise: 9000, status: "cancelled" }),
  ],
});
const t4 = makeTable({ id: "t4", name: "T4", status: "occupied" });

function settle(overrides: Partial<SettleInput> = {}) {
  return settleOrder({
    order: servedOrder,
    tables: [t4],
    orders: [servedOrder],
    parts: [{ method: "cash", amountPaise: 58800, tenderedPaise: 60000 }],
    taxRateBasisPoints: 500,
    where: "T4",
    invoiceNumber: 1001,
    at: NOW,
    by: "staff-cashier",
    newId,
    ...overrides,
  });
}

describe("settleOrder", () => {
  it("marks the order paid, saves the payment and frees the table", () => {
    const result = settle();
    expect(result.order.status).toBe("paid");
    expect(result.order.statusHistory.at(-1)).toEqual({
      status: "paid",
      at: NOW,
      by: "staff-cashier",
    });
    expect(result.payments).toEqual([
      expect.objectContaining({
        orderId: "o1",
        invoiceId: result.invoice.id,
        method: "cash",
        amountPaise: 58800,
        tenderedPaise: 60000,
        changePaise: 1200,
        takenBy: "staff-cashier",
      }),
    ]);
    expect(result.tables).toEqual([{ ...t4, status: "cleaning" }]);
  });

  it("freezes the bill on the invoice (cancelled items left out)", () => {
    const { invoice, payments } = settle();
    expect(invoice).toMatchObject({
      number: 1001,
      orderNumber: 101,
      where: "T4",
      subtotalPaise: 56000,
      discountPaise: 0,
      taxPaise: 2800,
      totalPaise: 58800,
      paymentIds: payments.map((p) => p.id),
    });
    expect(invoice.lines).toEqual([
      {
        name: "Paneer Tikka (Half)",
        details: "+ Extra cheese",
        quantity: 2,
        unitTotalPaise: 23000,
        lineTotalPaise: 46000,
      },
      { name: "Sweet Lassi", quantity: 1, unitTotalPaise: 10000, lineTotalPaise: 10000 },
    ]);
  });

  it("takes a split payment that adds up exactly", () => {
    const { payments } = settle({
      parts: [
        { method: "card", amountPaise: 30000 },
        { method: "upi", amountPaise: 28800 },
      ],
    });
    expect(payments.map((p) => p.method)).toEqual(["card", "upi"]);
  });

  it("works the total out again from the order, with its discount", () => {
    const discounted = {
      ...servedOrder,
      discount: { kind: "percent" as const, basisPoints: 1000 },
    };
    // ₹560 − 10% = ₹504, + 5% GST ₹25.20 = ₹529.20
    const { invoice } = settle({
      order: discounted,
      orders: [discounted],
      parts: [{ method: "card", amountPaise: 52920 }],
    });
    expect(invoice).toMatchObject({ discountPaise: 5600, totalPaise: 52920 });
    expect(() =>
      settle({
        order: discounted,
        orders: [discounted],
        parts: [{ method: "card", amountPaise: 58800 }], // the old, undiscounted total
      }),
    ).toThrow("more than what's left to pay");
  });

  it("refuses an order that isn't served yet, or is already paid", () => {
    expect(() => settle({ order: { ...servedOrder, status: "ready" } })).toThrow(
      "Order 101 is Ready. Serve it before taking payment.",
    );
    expect(() => settle({ order: { ...servedOrder, status: "paid" } })).toThrow(
      "already paid",
    );
  });

  it("refuses payments that don't cover the bill", () => {
    expect(() => settle({ parts: [{ method: "upi", amountPaise: 50000 }] })).toThrow(
      "₹88.00 is still left to pay.",
    );
  });
});

describe("tablesToFreeAfter", () => {
  const paid = { ...servedOrder, status: "paid" as const };

  it("keeps the table busy while another order there is still open", () => {
    const secondRound = makeOrder({ status: "preparing", tableIds: ["t4"] });
    expect(tablesToFreeAfter(paid, [t4], [paid, secondRound])).toEqual([]);
  });

  it("frees a whole joined group and separates it", () => {
    const t5 = makeTable({ id: "t5", status: "occupied", mergedIntoId: "t4" });
    const groupOrder = { ...paid, tableIds: ["t4", "t5"] };
    const freed = tablesToFreeAfter(groupOrder, [t4, t5], [groupOrder]);
    expect(freed).toEqual([
      { ...t4, status: "cleaning" },
      { ...makeTable({ id: "t5" }), status: "cleaning" },
    ]);
    expect(freed[1]).not.toHaveProperty("mergedIntoId");
  });

  it("keeps a joined group together while the main table has another order", () => {
    const t5 = makeTable({ id: "t5", status: "occupied", mergedIntoId: "t4" });
    const other = makeOrder({ status: "served", tableIds: ["t4"] });
    expect(
      tablesToFreeAfter({ ...paid, tableIds: ["t4", "t5"] }, [t4, t5], [other]),
    ).toEqual([]);
  });

  it("changes nothing for takeaway orders", () => {
    expect(tablesToFreeAfter({ ...paid, tableIds: [] }, [t4], [])).toEqual([]);
  });
});

describe("discounts and invoice numbers", () => {
  it("puts a discount on an open order and takes it off again", () => {
    const withDiscount = setOrderDiscount(
      servedOrder,
      { kind: "fixed", amountPaise: 5000, reason: "Regular guest" },
      NOW,
    );
    expect(withDiscount.discount).toEqual({
      kind: "fixed",
      amountPaise: 5000,
      reason: "Regular guest",
    });
    expect(setOrderDiscount(withDiscount, undefined, NOW)).not.toHaveProperty("discount");
  });

  it("checks a fixed discount against the bill without cancelled items", () => {
    // Subtotal is ₹560 (the ₹90 soup is cancelled), so ₹600 off is too much.
    expect(() =>
      setOrderDiscount(servedOrder, { kind: "fixed", amountPaise: 60000 }, NOW),
    ).toThrow("can't be more than the bill (₹560.00)");
  });

  it("never changes the bill of a paid order", () => {
    expect(() =>
      setOrderDiscount(
        { ...servedOrder, status: "paid" },
        { kind: "percent", basisPoints: 500 },
        NOW,
      ),
    ).toThrow("its bill can't change");
  });

  it("numbers invoices from INV-1001 upwards", () => {
    expect(nextInvoiceNumber([])).toBe(1001);
    expect(nextInvoiceNumber([{ number: 1001 }, { number: 1004 }])).toBe(1005);
    expect(invoiceLabel({ number: 1001 })).toBe("INV-1001");
  });
});
