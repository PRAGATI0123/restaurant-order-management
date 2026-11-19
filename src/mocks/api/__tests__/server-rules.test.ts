import { describe, expect, it } from "vitest";
import { makeItem, makeOrder } from "@/domain/__tests__/test-data";
import { checkOnServer } from "@/mocks/api/server-rules";
import type { Invoice } from "@/types/payment";
import type { OutboxEntry, SyncChange } from "@/types/sync";

const entry = (change: SyncChange): OutboxEntry => ({
  ...change,
  key: `${change.kind}:${change.id}`,
  queuedAt: 0,
  attempts: 0,
  nextAttemptAt: 0,
  status: "pending",
});

const goodInvoice: Invoice = {
  id: "inv-1",
  number: 1007,
  restaurant: { name: "R", address: "A", phone: "P", gstin: "G" },
  orderId: "o1",
  orderNumber: 107,
  orderType: "dine-in",
  where: "T1",
  lines: [{ name: "Naan", quantity: 2, unitTotalPaise: 8000, lineTotalPaise: 16000 }],
  subtotalPaise: 16000,
  discountPaise: 1600,
  taxRateBasisPoints: 500,
  taxPaise: 720,
  totalPaise: 15120,
  paymentIds: ["pay-1"],
  issuedBy: "s",
  issuedAt: "2026-11-19T12:00:00.000Z",
};
const invoiceEntry = (invoice: Invoice) =>
  entry({ kind: "invoice", id: invoice.id, op: "upsert", data: invoice, label: "INV" });

describe("the server checks every record again", () => {
  it("accepts a correct invoice", () => {
    expect(checkOnServer(invoiceEntry(goodInvoice), new Map())).toBeUndefined();
  });

  it("rejects an invoice whose numbers don't add up", () => {
    expect(
      checkOnServer(invoiceEntry({ ...goodInvoice, totalPaise: 15000 }), new Map()),
    ).toBe("INV-1007: total should be subtotal − discount + GST.");
    expect(
      checkOnServer(invoiceEntry({ ...goodInvoice, subtotalPaise: 17000 }), new Map()),
    ).toBe("INV-1007: the lines don't add up to the subtotal.");
    expect(
      checkOnServer(invoiceEntry({ ...goodInvoice, paymentIds: [] }), new Map()),
    ).toBe("INV-1007 has no payments.");
  });

  it("rejects an order number another till already used", () => {
    const mine = makeOrder({ id: "o-mine", number: 107 });
    const theirs = makeOrder({ id: "o-theirs", number: 107 });
    const saved = new Map<string, unknown>([["order:o-theirs", theirs]]);
    expect(
      checkOnServer(
        entry({ kind: "order", id: mine.id, op: "upsert", data: mine, label: "" }),
        saved,
      ),
    ).toBe("Order number 107 is already used by another till.");
    // The same order sent again (an update) is fine.
    expect(
      checkOnServer(
        entry({ kind: "order", id: theirs.id, op: "upsert", data: theirs, label: "" }),
        saved,
      ),
    ).toBeUndefined();
  });

  it("rejects an order with no dishes, unless it was cancelled", () => {
    const empty = makeOrder({ items: [makeItem({ status: "cancelled" })] });
    const send = (data: unknown) =>
      checkOnServer(
        entry({ kind: "order", id: "o", op: "upsert", data, label: "" }),
        new Map(),
      );
    expect(send(empty)).toBe("Order 42 has no dishes.");
    expect(send({ ...empty, status: "cancelled" })).toBeUndefined();
  });

  it("rejects bad payments, menu prices and GST rates", () => {
    const send = (kind: SyncChange["kind"], data: unknown) =>
      checkOnServer(entry({ kind, id: "x", op: "upsert", data, label: "" }), new Map());
    expect(send("payment", { method: "card", amountPaise: 0 })).toBe(
      "A payment must be more than ₹0.",
    );
    expect(send("payment", { method: "upi", amountPaise: 500, changePaise: 20 })).toBe(
      "Only cash payments can have change.",
    );
    expect(send("menuItem", { name: "Dal", pricePaise: 0, variants: [] })).toBe(
      "Dal needs a price above ₹0.",
    );
    expect(
      send("settings", {
        taxRateBasisPoints: 700,
        restaurant: {},
        kitchenTiming: { warningAfterMinutes: 10, lateAfterMinutes: 15 },
      }),
    ).toBe("That GST rate isn't allowed.");
  });

  it("always accepts deletes", () => {
    expect(
      checkOnServer(
        entry({ kind: "table", id: "t1", op: "delete", label: "T1" }),
        new Map(),
      ),
    ).toBeUndefined();
  });
});
