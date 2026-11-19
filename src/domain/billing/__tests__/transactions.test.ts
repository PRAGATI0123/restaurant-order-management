import { describe, expect, it } from "vitest";
import {
  NO_TRANSACTION_FILTERS,
  paymentTotals,
  splitGst,
  transactionRows,
} from "@/domain/billing/transactions";
import type { Invoice, Payment } from "@/types/payment";

function invoice(id: string, number: number, orderNumber: number): Invoice {
  return {
    id,
    number,
    restaurant: { name: "R", address: "A", phone: "P", gstin: "G" },
    orderId: `order-${orderNumber}`,
    orderNumber,
    orderType: "dine-in",
    where: "T1",
    lines: [],
    subtotalPaise: 0,
    discountPaise: 0,
    taxRateBasisPoints: 500,
    taxPaise: 0,
    totalPaise: 0,
    paymentIds: [],
    issuedBy: "s",
    issuedAt: "2026-11-16T10:00:00.000Z",
  };
}

function payment(
  id: string,
  invoiceId: string,
  method: Payment["method"],
  amountPaise: number,
  at: string,
  changePaise?: number,
): Payment {
  return {
    id,
    orderId: "o",
    invoiceId,
    method,
    amountPaise,
    ...(changePaise !== undefined
      ? { tenderedPaise: amountPaise + changePaise, changePaise }
      : {}),
    takenBy: "s",
    createdAt: `2026-11-16T${at}:00.000Z`,
  };
}

const invoices = [invoice("i1", 1001, 95), invoice("i2", 1002, 96)];
const payments = [
  payment("p1", "i1", "card", 50000, "10:00"),
  payment("p2", "i2", "cash", 30000, "11:00", 2000),
  payment("p3", "i2", "upi", 30000, "11:00"), // same moment: the split's second part
];

describe("transactionRows", () => {
  it("lists every payment newest first, with its invoice", () => {
    const rows = transactionRows(payments, invoices, NO_TRANSACTION_FILTERS);
    expect(rows.map((r) => r.payment.id)).toEqual(["p3", "p2", "p1"]);
    expect(rows[2]?.invoice?.number).toBe(1001);
  });

  it("filters by payment method", () => {
    const rows = transactionRows(payments, invoices, { method: "cash", query: "" });
    expect(rows.map((r) => r.payment.id)).toEqual(["p2"]);
  });

  it("finds a bill by invoice or order number, typed any way", () => {
    const ids = (query: string) =>
      transactionRows(payments, invoices, { method: "all", query }).map(
        (r) => r.payment.id,
      );
    expect(ids("INV-1001")).toEqual(["p1"]);
    expect(ids("inv-1002")).toEqual(["p3", "p2"]);
    expect(ids("#95")).toEqual(["p1"]);
    expect(ids("96")).toEqual(["p3", "p2"]);
    expect(ids("777")).toEqual([]);
  });
});

describe("paymentTotals", () => {
  it("adds up what was taken, per method, without the change given back", () => {
    expect(paymentTotals(payments)).toEqual({
      count: 3,
      totalPaise: 110000,
      changePaise: 2000,
      byMethod: {
        cash: { count: 1, totalPaise: 30000 },
        card: { count: 1, totalPaise: 50000 },
        upi: { count: 1, totalPaise: 30000 },
      },
    });
  });

  it("is all zeros on a day with no payments", () => {
    expect(paymentTotals([]).totalPaise).toBe(0);
    expect(paymentTotals([]).byMethod.upi).toEqual({ count: 0, totalPaise: 0 });
  });
});

describe("splitGst", () => {
  it("splits GST into equal CGST and SGST halves that add up exactly", () => {
    expect(splitGst(5535)).toEqual({ cgstPaise: 2768, sgstPaise: 2767 });
    expect(splitGst(6150)).toEqual({ cgstPaise: 3075, sgstPaise: 3075 });
    expect(splitGst(0)).toEqual({ cgstPaise: 0, sgstPaise: 0 });
  });
});
