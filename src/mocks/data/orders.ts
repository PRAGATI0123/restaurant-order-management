import { DEFAULT_TAX_RATE_BASIS_POINTS, RESTAURANT_DETAILS } from "@/config/constants";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { settleOrder } from "@/domain/billing/checkout";
import { quickCashAmounts, type PaymentDraft } from "@/domain/billing/payments";
import { splitEqually } from "@/domain/billing/split-bill";
import { orderWhere } from "@/domain/orders/order-where";
import type { Id, IsoDateTime } from "@/types/common";
import type { Discount, Order, OrderItem, OrderStatus } from "@/types/order";
import type { Invoice, Payment, PaymentMethod } from "@/types/payment";
import type { RestaurantTable, TableStatus } from "@/types/table";
import { sampleAddOns, sampleMenuItems, sampleModifierGroups } from "./menu";
import { sampleTables } from "./tables";

/**
 * THE SAMPLE SERVICE: a busy evening to show the app with. Orders in the
 * kitchen and at tables, plus bills paid earlier today.
 *
 * The app does NOT start with it: a fresh install opens on an empty day, like
 * a real restaurant would. A manager loads it on demand (Settings → Load sample
 * service), and every time it's built from the current time ("placed 12
 * minutes ago"), so the kitchen timers and "today" in reports are always right.
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
  /** Squeezes every time towards now (1 = as written). See dayScale(). */
  scale = 1,
): Order {
  const placedAt = minutesAgo(placedMinutesAgo * scale);
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
      at: minutesAgo((placedMinutesAgo - i * 6) * scale),
      by: "staff-waiter",
    })),
    createdBy: "staff-waiter",
    createdAt: placedAt,
    updatedAt: placedAt,
  };
}

/** Orders still in progress: at tables, in the kitchen, waiting at the pass. */
const inProgress = (): Order[] => [
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
  scale: number,
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
    restaurant: RESTAURANT_DETAILS,
    where: orderWhere(order, (id) => sampleTables.find((t) => t.id === id)?.name),
    invoiceNumber,
    // Paid 40 minutes after ordering (less, if the day has only just begun).
    at: new Date(Date.parse(order.createdAt) + 40 * scale * 60_000).toISOString(),
    by: "staff-cashier",
    // Fixed ids, so loading the sample service again replaces these records
    // (on the device and on the server) instead of adding copies.
    newId: (prefix) => `${prefix}-${invoiceNumber}-${++next}`,
  });
}

/** The earliest sample bill was ordered this many minutes ago. */
const HISTORY_MINUTES = 300;

/**
 * Keeps "earlier today" inside today. Late in the day the bills are spread
 * over the last 5 hours as written (scale 1). Just after midnight there isn't
 * 5 hours of today yet, so every time is squeezed into the minutes since
 * midnight; otherwise the bills would land on yesterday and the dashboard
 * would show no sales today.
 */
export function dayScale(now: Date = new Date()): number {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const minutesToday = (now.getTime() - midnight.getTime()) / 60_000;
  // Keep a minute spare, so nothing lands exactly on midnight.
  return Math.min(1, Math.max(0, (minutesToday - 1) / HISTORY_MINUTES));
}

/** Orders paid earlier today, each with its payments and invoice. */
function paidToday() {
  const scale = dayScale();
  const served = (
    id: Id,
    number: number,
    orderFor: For,
    minutes: number,
    items: OrderItem[],
  ) => order(id, number, orderFor, "served", minutes, items, scale);
  const paid = (
    o: Order,
    paidWith: PaidWith,
    invoiceNumber: number,
    discount?: Discount,
  ) => paidEarlier(o, paidWith, invoiceNumber, scale, discount);

  return [
    paid(
      served("order-95", 95, { table: "t1" }, HISTORY_MINUTES, [
        line("item-hara-bhara", 1),
        line("item-paneer-butter-masala", 1),
        line("item-butter-naan", 2),
        line("item-masala-chaas", 2),
      ]),
      "card",
      1001,
    ),
    paid(
      served("order-96", 96, { takeaway: "Neha" }, 270, [
        line("item-veg-biryani", 2, { optionIds: ["mod-spice-mild"] }),
        line("item-gulab-jamun", 2),
      ]),
      "upi",
      1002,
    ),
    paid(
      served("order-97", 97, { table: "t7" }, 240, [
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
    paid(
      served("order-98", 98, { table: "t3" }, 200, [
        line("item-crispy-corn", 1),
        line("item-kadai-veg", 1),
        line("item-tandoori-roti", 3),
        line("item-lime-soda", 2, { optionIds: ["mod-soda-sweet"] }),
      ]),
      "cash",
      1004,
    ),
    paid(
      served(
        "order-99",
        99,
        {
          delivery: {
            customerName: "Kabir Shah",
            phone: "9812345670",
            address: "7 Lake View Road, Kolkata",
          },
        },
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
    paid(
      served("order-100", 100, { table: "t9" }, 95, [
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
}

/** Dishes that ran out during the sample service (shown as sold out). */
export const SAMPLE_SERVICE_SOLD_OUT: Id[] = ["item-fish-amritsari", "item-brownie"];

/** How the floor looks during the sample service (other tables are free). */
const SERVICE_TABLES: Record<Id, TableStatus> = {
  t2: "occupied", // order 101
  t3: "reserved",
  t4: "occupied", // order 102
  t6: "cleaning",
  t8: "occupied", // order 103
};

export type SampleService = {
  tables: RestaurantTable[];
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];
};

/**
 * Builds the sample service from the current time: the sample floor plan with
 * busy tables, 6 orders in progress and 6 bills paid earlier today.
 */
export function sampleService(): SampleService {
  const paid = paidToday();
  return {
    tables: sampleTables.map((table) => ({
      ...table,
      status: SERVICE_TABLES[table.id] ?? "available",
    })),
    // Paid earlier today first, then the orders still in progress.
    orders: [...paid.map((p) => p.order), ...inProgress()],
    payments: paid.flatMap((p) => p.payments),
    invoices: paid.map((p) => p.invoice),
  };
}
