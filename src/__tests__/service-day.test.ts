import { beforeEach, describe, expect, it } from "vitest";
import { seededRandom } from "@/domain/__tests__/test-data";
import { calculateBill } from "@/domain/billing/calculate-bill";
import {
  nextEqualShare,
  quickCashAmounts,
  type PaymentDraft,
} from "@/domain/billing/payments";
import { paymentTotals } from "@/domain/billing/transactions";
import { buildKitchenBoard } from "@/domain/kitchen/kitchen-board";
import { sumPaise } from "@/domain/money";
import { buildOrderItem, groupsFor, type Catalog } from "@/domain/orders/item-choices";
import { invoicesIn, rangeFor, salesSummary } from "@/domain/reports/sales-report";
import { useMenuStore } from "@/stores/menu-store";
import { useServiceStore } from "@/stores/service-store";
import { useSettingsStore } from "@/stores/settings-store";
import { loginAs, resetAuth } from "@/stores/__tests__/login-as";
import type { Discount, Order, OrderItem } from "@/types/order";
import type { MenuItem } from "@/types/menu";

/**
 * INTEGRATION TESTS: whole flows through the real stores and rules, acting as
 * each role, the way the screens drive them. The unit tests check each rule
 * on its own; these check that they add up to a correct service.
 */

const service = () => useServiceStore.getState();
const menu = () => useMenuStore.getState();
const order = (id: string) => service().orders.find((o) => o.id === id)!;
const table = (id: string) => service().tables.find((t) => t.id === id)!;
const taxRate = () => useSettingsStore.getState().taxRateBasisPoints;
const billOf = (o: Order) =>
  calculateBill({ items: o.items, discount: o.discount, taxRateBasisPoints: taxRate() });

let lineNo = 0;
/** An order line the way the New order screen makes one: first size, required options. */
function line(menuItemId: string, quantity: number, sizeIndex = 0): OrderItem {
  const item = menu().items.find((i) => i.id === menuItemId)!;
  return lineFor(item, quantity, sizeIndex);
}
function lineFor(item: MenuItem, quantity: number, sizeIndex = 0): OrderItem {
  const catalog: Catalog = {
    addOns: menu().addOns,
    modifierGroups: menu().modifierGroups,
  };
  const optionIds = Object.fromEntries(
    groupsFor(item, catalog)
      .filter((g) => g.minSelect > 0)
      .map((g) => [g.id, [g.options[0]!.id]]),
  );
  return buildOrderItem(
    item,
    { variantId: item.variants[sizeIndex]?.id, addOnIds: [], optionIds, quantity },
    catalog,
    `test-line-${++lineNo}`,
  );
}

beforeEach(() => {
  useServiceStore.setState(useServiceStore.getInitialState(), true);
  useMenuStore.setState(useMenuStore.getInitialState(), true);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  resetAuth();
});

describe("a full dine-in service, through every role", () => {
  it("seats, cooks, serves, bills, frees the table and shows up in reports", () => {
    // WAITER takes the order at a free table.
    loginAs("waiter");
    const placed = service().placeOrder({
      type: "dine-in",
      tableId: "t5",
      items: [
        line("item-paneer-tikka", 1, 1), // Full
        line("item-garlic-naan", 3),
        line("item-sweet-lassi", 2),
      ],
    });
    expect(table("t5").status).toBe("occupied");
    expect(placed).toMatchObject({ status: "new", createdBy: "staff-waiter" });

    // KITCHEN cooks it; it moves across the board.
    loginAs("kitchen");
    service().setOrderStatus(placed.id, "preparing");
    service().setOrderStatus(placed.id, "ready");
    expect(buildKitchenBoard(service().orders).ready.map((o) => o.id)).toContain(
      placed.id,
    );

    // WAITER serves it.
    loginAs("waiter");
    service().setOrderStatus(placed.id, "served");

    // CASHIER gives 10% off and two guests split the bill: cash with change, and UPI.
    loginAs("cashier");
    service().setDiscount(placed.id, {
      kind: "percent",
      basisPoints: 1000,
      reason: "Regular guest",
    });
    const total = billOf(order(placed.id)).totalPaise;
    const first = nextEqualShare(total, 2, 0, total);
    const second = nextEqualShare(total, 2, 1, total - first);
    const tendered = quickCashAmounts(first)[1]!; // the next round note
    const invoice = service().settleOrder(placed.id, [
      { method: "cash", amountPaise: first, tenderedPaise: tendered },
      { method: "upi", amountPaise: second },
    ]);

    // The order went through every step, each by the right person.
    expect(order(placed.id).statusHistory.map((s) => [s.status, s.by])).toEqual([
      ["new", "staff-waiter"],
      ["preparing", "staff-kitchen"],
      ["ready", "staff-kitchen"],
      ["served", "staff-waiter"],
      ["paid", "staff-cashier"],
    ]);

    // The money adds up to the paisa, everywhere.
    const paid = service().payments.filter((p) => p.invoiceId === invoice.id);
    expect(sumPaise(paid.map((p) => p.amountPaise))).toBe(invoice.totalPaise);
    expect(invoice.totalPaise).toBe(
      invoice.subtotalPaise - invoice.discountPaise + invoice.taxPaise,
    );
    expect(sumPaise(invoice.lines.map((l) => l.lineTotalPaise))).toBe(
      invoice.subtotalPaise,
    );
    expect(paid.find((p) => p.method === "cash")?.changePaise).toBe(tendered - first);

    // The table needs wiping before the next guests.
    expect(table("t5").status).toBe("cleaning");

    // MANAGER sees it in today's report, matching the payments.
    loginAs("manager");
    const today = invoicesIn(service().invoices, rangeFor("today", new Date()));
    expect(today.map((i) => i.id)).toContain(invoice.id);
    expect(salesSummary(today).totalPaise).toBe(
      paymentTotals(
        service().payments.filter((p) => today.some((i) => i.id === p.invoiceId)),
      ).totalPaise,
    );

    // WAITER marks the table clean: ready for the next guests.
    loginAs("waiter");
    service().setTableStatus("t5", "available");
    expect(table("t5").status).toBe("available");
  });
});

describe("order-state consistency: a refused step changes nothing at all", () => {
  it("leaves every record exactly as it was", () => {
    loginAs("manager");
    const before = useServiceStore.getState();
    const attempts: [string, () => unknown][] = [
      [
        "pay an order still cooking",
        () => service().settleOrder("order-101", [{ method: "card", amountPaise: 1 }]),
      ],
      [
        "pay the wrong amount",
        () => service().settleOrder("order-102", [{ method: "card", amountPaise: 100 }]),
      ],
      [
        "move an order backwards",
        () => service().setOrderStatus("order-105", "preparing"),
      ],
      [
        "serve an order not cooked yet",
        () => service().setOrderStatus("order-103", "served"),
      ],
      [
        "seat guests at a dirty table",
        () =>
          service().placeOrder({
            type: "dine-in",
            tableId: "t6",
            items: [line("item-dal-makhani", 1)],
          }),
      ],
      [
        "move an order onto a reserved table",
        () => service().moveOrderToTable("order-102", "t3"),
      ],
      [
        "free a table with an open order",
        () => service().setTableStatus("t4", "available"),
      ],
    ];
    for (const [what, attempt] of attempts) {
      expect(attempt, what).toThrow();
      // Same object: not one order, table or payment was touched.
      expect(useServiceStore.getState(), what).toBe(before);
    }
  });

  it("refuses work outside a role without touching anything", () => {
    loginAs("waiter");
    const before = useServiceStore.getState();
    expect(() => service().cancelOrder("order-101", "Guest left")).toThrow(/waiter/);
    expect(() =>
      service().setDiscount("order-102", { kind: "percent", basisPoints: 500 }),
    ).toThrow(/waiter/);
    expect(useServiceStore.getState()).toBe(before);
  });
});

describe("billing accuracy at scale", () => {
  it("200 random orders: every bill, payment and report adds up to the paisa", () => {
    loginAs("manager");
    const random = seededRandom(20261119); // same "random" orders every run
    const dishes = menu().items.filter((i) => i.isAvailable);
    const startInvoices = service().invoices.length;

    for (let n = 0; n < 200; n++) {
      const items = Array.from({ length: 1 + random(5) }, () =>
        lineFor(dishes[random(dishes.length)]!, 1 + random(5)),
      );
      const placed = service().placeOrder({ type: "takeaway", items });
      for (const step of ["preparing", "ready", "served"] as const) {
        service().setOrderStatus(placed.id, step);
      }

      const subtotal = billOf(order(placed.id)).subtotalPaise;
      const discounts: (Discount | undefined)[] = [
        undefined,
        { kind: "percent", basisPoints: 100 + random(4901) }, // 1% … 50%, odd values too
        { kind: "fixed", amountPaise: 1 + random(subtotal) }, // never more than the bill
      ];
      const discount = discounts[random(3)];
      if (discount) service().setDiscount(placed.id, discount);

      // 1–4 guests split equally, each paying a random way.
      const total = billOf(order(placed.id)).totalPaise;
      const guests = 1 + random(4);
      const parts: PaymentDraft[] = [];
      let due = total;
      for (let g = 0; g < guests && due > 0; g++) {
        const amountPaise =
          g === guests - 1 ? due : nextEqualShare(total, guests, g, due);
        const method = (["cash", "card", "upi"] as const)[random(3)]!;
        parts.push(
          method === "cash"
            ? { method, amountPaise, tenderedPaise: amountPaise + random(500) * 100 }
            : { method, amountPaise },
        );
        due -= amountPaise;
      }
      const invoice = service().settleOrder(placed.id, parts);

      expect(invoice.totalPaise).toBe(total);
      expect(invoice.totalPaise).toBe(
        invoice.subtotalPaise - invoice.discountPaise + invoice.taxPaise,
      );
      expect(invoice.discountPaise).toBeLessThanOrEqual(invoice.subtotalPaise);
      for (const value of [invoice.subtotalPaise, invoice.taxPaise, invoice.totalPaise]) {
        expect(Number.isSafeInteger(value)).toBe(true); // whole paise, never fractions
      }
    }

    // Across the whole day: invoices, payments and the report agree exactly.
    const { invoices, payments } = service();
    expect(invoices.length - startInvoices).toBe(200);
    const invoiceTotal = sumPaise(invoices.map((i) => i.totalPaise));
    expect(paymentTotals(payments).totalPaise).toBe(invoiceTotal);
    expect(salesSummary(invoices).totalPaise).toBe(invoiceTotal);
    for (const inv of invoices) {
      const paidForIt = payments.filter((p) => p.invoiceId === inv.id);
      expect(sumPaise(paidForIt.map((p) => p.amountPaise))).toBe(inv.totalPaise);
    }
  });
});
