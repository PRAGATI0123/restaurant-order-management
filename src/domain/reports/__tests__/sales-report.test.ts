import { describe, expect, it } from "vitest";
import { makeItem, makeOrder, makeTable } from "@/domain/__tests__/test-data";
import {
  cancellations,
  floorNow,
  hourLabel,
  invoicesIn,
  itemSales,
  rangeFor,
  salesByHour,
  salesByType,
  salesSummary,
  toCsv,
} from "@/domain/reports/sales-report";
import type { Invoice, InvoiceLine } from "@/types/payment";

/** A local date and time (the device's time zone), as an ISO string. */
const local = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString(); // November 2026

const NOW = new Date(2026, 10, 16, 15, 30); // 16 Nov, 3:30 pm

function line(name: string, quantity: number, unit: number): InvoiceLine {
  return { name, quantity, unitTotalPaise: unit, lineTotalPaise: unit * quantity };
}

let next = 1000;
function invoice(
  issuedAt: string,
  lines: InvoiceLine[],
  extra: Partial<Invoice> = {},
): Invoice {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);
  const discount = extra.discountPaise ?? 0;
  const tax = Math.round((subtotal - discount) * 0.05);
  next += 1;
  return {
    id: `inv-${next}`,
    number: next,
    restaurant: { name: "R", address: "A", phone: "P", gstin: "G" },
    orderId: `o-${next}`,
    orderNumber: next - 900,
    orderType: "dine-in",
    where: "T1",
    lines,
    subtotalPaise: subtotal,
    discountPaise: discount,
    taxRateBasisPoints: 500,
    taxPaise: tax,
    totalPaise: subtotal - discount + tax,
    paymentIds: [],
    issuedBy: "s",
    issuedAt,
    ...extra,
  };
}

describe("date ranges (whole local days)", () => {
  it("today runs from midnight to midnight", () => {
    const today = rangeFor("today", NOW);
    expect(new Date(today.from)).toEqual(new Date(2026, 10, 16));
    expect(new Date(today.to)).toEqual(new Date(2026, 10, 17));
  });

  it("the last 7 days include today", () => {
    const week = rangeFor("last7", NOW);
    expect(new Date(week.from)).toEqual(new Date(2026, 10, 10));
    expect(new Date(week.to)).toEqual(new Date(2026, 10, 17));
  });

  it("puts each bill on the day it was paid", () => {
    const late = invoice(local(15, 23, 59), []);
    const early = invoice(local(16, 0, 0), []);
    expect(invoicesIn([late, early], rangeFor("today", NOW))).toEqual([early]);
    expect(invoicesIn([late, early], rangeFor("yesterday", NOW))).toEqual([late]);
  });

  it("works across a month change", () => {
    const first = new Date(2026, 11, 1, 10); // 1 Dec
    expect(new Date(rangeFor("yesterday", first).from)).toEqual(new Date(2026, 10, 30));
  });
});

describe("salesSummary", () => {
  it("adds up bills, discounts, tax and the average bill", () => {
    const a = invoice(local(16, 12), [line("Naan", 2, 8000)]); // 160 + 8 = ₹168
    const b = invoice(local(16, 13), [line("Dal", 1, 31000)], { discountPaise: 3100 }); // 279 + 13.95
    expect(salesSummary([a, b])).toEqual({
      bills: 2,
      subtotalPaise: 47000,
      discountPaise: 3100,
      discountedBills: 1,
      taxPaise: 800 + 1395,
      totalPaise: 16800 + 29295,
      averagePaise: Math.round((16800 + 29295) / 2),
    });
  });

  it("is all zeros, with no division by zero, when nothing was sold", () => {
    expect(salesSummary([]).averagePaise).toBe(0);
  });
});

describe("itemSales", () => {
  it("adds each dish up across bills, best earner first", () => {
    const sales = itemSales([
      invoice(local(16, 12), [line("Naan", 4, 8000), line("Dal", 1, 31000)]),
      invoice(local(16, 13), [line("Naan", 2, 8000), line("Lassi", 3, 12000)]),
    ]);
    expect(sales).toEqual([
      { name: "Naan", quantity: 6, revenuePaise: 48000 },
      { name: "Lassi", quantity: 3, revenuePaise: 36000 },
      { name: "Dal", quantity: 1, revenuePaise: 31000 },
    ]);
  });
});

describe("salesByHour", () => {
  it("fills every hour from the first sale to the last, gaps included", () => {
    const hours = salesByHour([
      invoice(local(16, 12, 10), [line("A", 1, 10000)]),
      invoice(local(16, 12, 50), [line("B", 1, 10000)]),
      invoice(local(16, 14, 5), [line("C", 1, 20000)]),
    ]);
    expect(hours.map((h) => [h.hour, h.bills, h.totalPaise])).toEqual([
      [12, 2, 21000],
      [13, 0, 0],
      [14, 1, 21000],
    ]);
  });

  it("is empty with no sales, and labels hours the way people say them", () => {
    expect(salesByHour([])).toEqual([]);
    expect([0, 11, 12, 13, 23].map(hourLabel)).toEqual([
      "12 am",
      "11 am",
      "12 pm",
      "1 pm",
      "11 pm",
    ]);
  });
});

describe("salesByType", () => {
  it("always lists all three order types", () => {
    const sales = salesByType([
      invoice(local(16, 12), [line("A", 1, 10000)], { orderType: "takeaway" }),
    ]);
    expect(sales.map((s) => [s.type, s.bills])).toEqual([
      ["dine-in", 0],
      ["takeaway", 1],
      ["delivery", 0],
    ]);
  });
});

describe("cancellations", () => {
  const today = rangeFor("today", NOW);

  it("lists cancelled orders and dishes with their reasons and value", () => {
    const cancelled = makeOrder({
      number: 120,
      status: "cancelled",
      cancelReason: "Guest left",
      items: [makeItem({ name: "Dal", unitPricePaise: 31000 })],
      statusHistory: [
        { status: "new", at: local(16, 12), by: "s" },
        { status: "cancelled", at: local(16, 12, 20), by: "s" },
      ],
    });
    const withDish = makeOrder({
      number: 121,
      status: "served",
      createdAt: local(16, 13),
      items: [
        makeItem({
          name: "Naan",
          unitPricePaise: 8000,
          quantity: 2,
          status: "cancelled",
          cancelReason: "Burnt",
        }),
        makeItem({ name: "Rice" }),
      ],
    });
    expect(cancellations([cancelled, withDish], today)).toEqual([
      {
        orderNumber: 121,
        kind: "item",
        name: "Naan",
        quantity: 2,
        valuePaise: 16000,
        reason: "Burnt",
      },
      {
        orderNumber: 120,
        kind: "order",
        name: "Order 120",
        quantity: 1,
        valuePaise: 31000,
        reason: "Guest left",
      },
    ]);
  });

  it("leaves out other days", () => {
    const old = makeOrder({
      status: "cancelled",
      statusHistory: [{ status: "cancelled", at: local(10, 12), by: "s" }],
    });
    expect(cancellations([old], today)).toEqual([]);
  });
});

describe("floorNow and toCsv", () => {
  it("counts busy tables and open orders", () => {
    const tables = [
      makeTable({ id: "a", status: "occupied" }),
      makeTable({ id: "b", status: "available" }),
      makeTable({ id: "c", status: "cleaning" }),
    ];
    const orders = [makeOrder({ status: "served" }), makeOrder({ status: "paid" })];
    expect(floorNow(tables, orders)).toEqual({
      tables: 3,
      occupied: 1,
      available: 1,
      openOrders: 1,
    });
  });

  it("writes CSV that spreadsheets read correctly", () => {
    expect(
      toCsv([
        ["Dish", "Qty"],
        ["Paneer Tikka (Half)", 2],
        ['Chef\'s "special", hot', 1],
      ]),
    ).toBe('Dish,Qty\r\nPaneer Tikka (Half),2\r\n"Chef\'s ""special"", hot",1');
  });
});
