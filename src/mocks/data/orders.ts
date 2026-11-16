import { DEFAULT_TAX_RATE_BASIS_POINTS } from "@/config/constants";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { settleOrder } from "@/domain/billing/checkout";
import { quickCashAmounts, type PaymentDraft } from "@/domain/billing/payments";
import { splitEqually } from "@/domain/billing/split-bill";
import { orderWhere } from "@/domain/orders/order-where";
import type { Id, IsoDateTime } from "@/types/common";
import type { Discount, Order, OrderItem, OrderStatus } from "@/types/order";
import type { PaymentMethod } from "@/types/payment";
import { sampleAddOns, sampleMenuItems, sampleModifierGroups } from "./menu";
import { sampleTables } from "./tables";

/**
 * SAMPLE ORDERS that are "in progress" when the app opens, so the floor plan
 * and the kitchen board have something to show. Times are relative to when
 * the app starts ("placed 25 minutes ago").
 */

function minutesAgo(minutes: number): IsoDateTime {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/**
 * Builds an order line from the sample menu, COPYING names and prices like a
 * real order does (Step 7: old bills never change when the menu changes).
 */
function line(
  menuItemId: Id,
  quantity: number,
  choices: { size?: string; addOnIds?: Id[]; optionIds?: Id[]; note?: string } = {},
): OrderItem {
  const menuItem = sampleMenuItems.find((item) => item.id === menuItemId);
  if (!menuItem) throw new Error(`Sample order uses unknown dish ${menuItemId}`);
  const variant = menuItem.variants.find((v) => v.name === choices.size);
  const allOptions = sampleModifierGroups.flatMap((group) => group.options);

  return {
    id: `${menuItemId}-line`,
    menuItemId,
    name: menuItem.name,
    variant: variant && { id: variant.id, name: variant.name },
    unitPricePaise: variant?.pricePaise ?? menuItem.pricePaise,
    addOns: (choices.addOnIds ?? []).map((id) => {
      const addOn = sampleAddOns.find((a) => a.id === id)!;
      return { id: addOn.id, name: addOn.name, pricePaise: addOn.pricePaise };
    }),
    modifiers: (choices.optionIds ?? []).map((id) => {
      const option = allOptions.find((o) => o.id === id)!;
      return { id: option.id, name: option.name, pricePaise: option.pricePaise };
    }),
    quantity,
    ...(choices.note ? { note: choices.note } : {}),
    status: "active",
  };
}

/** Who the order is for: a table (dine-in), or a takeaway / delivery customer. */
type For =
  | { table: Id }
  | { takeaway: string }
  | { delivery: { customerName: string; phone: string; address: string } };

function order(
  id: Id,
  number: number,
  orderFor: For,
  status: OrderStatus,
  placedMinutesAgo: number,
  items: OrderItem[],
): Order {
  const placedAt = minutesAgo(placedMinutesAgo);
  // Fill in the timeline up to the current status, a few minutes apart.
  const path: OrderStatus[] = ["new", "preparing", "ready", "served"];
  const steps = path.slice(0, path.indexOf(status) + 1);
  return {
    id,
    number,
    status,
    ...("table" in orderFor
      ? { type: "dine-in" as const, tableIds: [orderFor.table] }
      : "takeaway" in orderFor
        ? { type: "takeaway" as const, tableIds: [], customerName: orderFor.takeaway }
        : { type: "delivery" as const, tableIds: [], delivery: orderFor.delivery }),
    items,
    statusHistory: steps.map((s, i) => ({
      status: s,
      at: minutesAgo(placedMinutesAgo - i * 6),
      by: "staff-waiter",
    })),
    createdBy: "staff-waiter",
    createdAt: placedAt,
    updatedAt: placedAt,
  };
}

export const sampleOrders: Order[] = [
  order("order-101", 101, { table: "t2" }, "preparing", 12, [
    line("item-paneer-tikka", 1, { size: "Half", optionIds: ["mod-spice-medium"] }),
    line("item-sweet-lassi", 2),
  ]),
  order("order-102", 102, { table: "t4" }, "served", 38, [
    line("item-butter-chicken", 1, { optionIds: ["mod-spice-hot"] }),
    line("item-dal-makhani", 1, { addOnIds: ["add-butter"] }),
    line("item-garlic-naan", 4),
    line("item-jeera-rice", 1),
  ]),
  order("order-103", 103, { table: "t8" }, "new", 3, [
    line("item-chicken-biryani", 2, { size: "Full", optionIds: ["mod-spice-mild"] }),
    line("item-lime-soda", 2, { optionIds: ["mod-soda-salted"] }),
  ]),
  // Takeaway and delivery tickets, so the kitchen board has a full service:
  // one late (17 min), one waiting at the pass, one just in.
  order("order-104", 104, { takeaway: "Rohan" }, "preparing", 17, [
    line("item-veg-biryani", 1, { note: "No onion, Jain" }),
    line("item-garlic-naan", 2),
    line("item-dal-makhani", 1),
  ]),
  order("order-105", 105, { takeaway: "Priya" }, "ready", 14, [
    line("item-paneer-butter-masala", 1),
    line("item-butter-naan", 3),
  ]),
  order(
    "order-106",
    106,
    {
      delivery: {
        customerName: "Arjun Mehta",
        phone: "9876543210",
        address: "14 Park Street, Kolkata",
      },
    },
    "new",
    1,
    [
      line("item-chicken-tikka", 1, { note: "Extra chutney, pack separately" }),
      line("item-garlic-naan", 2),
      line("item-gulab-jamun", 2),
    ],
  ),
];

// ─── Earlier today ───────────────────────────────────────────────────────────

/** How a sample bill was paid: one method, or split equally between two. */
type PaidWith = PaymentMethod | [PaymentMethod, PaymentMethod];

/**
 * Turns a served sample order into a PAID one, using the real checkout rule
 * (settleOrder). So the sample payments and invoices follow exactly the same
 * rules as live ones: totals, GST, change and invoice numbers.
 * Cash guests hand over the next round note, so there's some change to see.
 */
function paidEarlier(
  served: Order,
  paidWith: PaidWith,
  invoiceNumber: number,
  discount?: Discount,
) {
  const order = discount ? { ...served, discount } : served;
  const { totalPaise } = calculateBill({
    items: order.items,
    discount: order.discount,
    taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
  });
  const methods = Array.isArray(paidWith) ? paidWith : [paidWith];
  const shares = splitEqually(totalPaise, methods.length);
  const parts: PaymentDraft[] = methods.map((method, i) => {
    const amountPaise = shares[i] ?? 0;
    return method === "cash"
      ? {
          method,
          amountPaise,
          tenderedPaise: quickCashAmounts(amountPaise)[1] ?? amountPaise,
        }
      : { method, amountPaise };
  });

  let next = 0;
  return settleOrder({
    order,
    tables: [], // these guests left long ago: no table changes now
    orders: [order],
    parts,
    taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
    where: orderWhere(order, (id) => sampleTables.find((t) => t.id === id)?.name),
    invoiceNumber,
    at: new Date(Date.parse(order.createdAt) + 40 * 60_000).toISOString(), // paid 40 min after ordering
    by: "staff-cashier",
    newId: (prefix) => `${prefix}-${invoiceNumber}-${++next}`, // fixed ids: same on server and browser
  });
}

const earlier = [
  paidEarlier(
    order("order-95", 95, { table: "t1" }, "served", 300, [
      line("item-hara-bhara", 1),
      line("item-paneer-butter-masala", 1),
      line("item-butter-naan", 2),
      line("item-masala-chaas", 2),
    ]),
    "card",
    1001,
  ),
  paidEarlier(
    order("order-96", 96, { takeaway: "Neha" }, "served", 270, [
      line("item-veg-biryani", 2, { optionIds: ["mod-spice-mild"] }),
      line("item-gulab-jamun", 2),
    ]),
    "upi",
    1002,
  ),
  paidEarlier(
    order("order-97", 97, { table: "t7" }, "served", 240, [
      line("item-chicken-tikka", 1),
      line("item-butter-chicken", 2, { optionIds: ["mod-spice-medium"] }),
      line("item-garlic-naan", 4),
      line("item-jeera-rice", 2),
      line("item-sweet-lassi", 3),
    ]),
    ["cash", "upi"],
    1003,
    { kind: "percent", basisPoints: 1000, reason: "Regular guest" },
  ),
  paidEarlier(
    order("order-98", 98, { table: "t3" }, "served", 200, [
      line("item-crispy-corn", 1),
      line("item-kadai-veg", 1),
      line("item-tandoori-roti", 3),
      line("item-lime-soda", 2, { optionIds: ["mod-soda-sweet"] }),
    ]),
    "cash",
    1004,
  ),
  paidEarlier(
    order(
      "order-99",
      99,
      {
        delivery: {
          customerName: "Kabir Shah",
          phone: "9812345670",
          address: "7 Lake View Road, Kolkata",
        },
      },
      "served",
      150,
      [
        line("item-rogan-josh", 1),
        line("item-laccha-paratha", 2),
        line("item-rasmalai", 2),
      ],
    ),
    "upi",
    1005,
  ),
  paidEarlier(
    order("order-100", 100, { table: "t9" }, "served", 95, [
      line("item-paneer-tikka", 1, { size: "Full" }),
      line("item-dal-makhani", 1),
      line("item-chicken-biryani", 1, { size: "Half" }),
      line("item-butter-naan", 3),
      line("item-cold-coffee", 2),
      line("item-brownie", 1),
    ]),
    ["card", "cash"],
    1006,
  ),
];

/** Orders paid earlier today, with their payments and invoices. */
export const sampleHistory = {
  orders: earlier.map((e) => e.order),
  payments: earlier.flatMap((e) => e.payments),
  invoices: earlier.map((e) => e.invoice),
};
