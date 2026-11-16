import type { IsoDateTime, Paise } from "@/types/common";
import type { Order, OrderType } from "@/types/order";
import type { Invoice } from "@/types/payment";
import type { RestaurantTable } from "@/types/table";
import { itemUnitTotal } from "../billing/calculate-bill";
import { sumPaise } from "../money";
import { isOrderOpen } from "../orders/order-state-machine";

/**
 * REPORTS — business rules
 *
 *  - Sales come from INVOICES, never from live orders. An invoice is the bill
 *    frozen at payment, so a report reads the same tomorrow as today, even if
 *    prices change in between.
 *  - A sale belongs to the day it was PAID (the invoice time), in the
 *    restaurant's own time zone (the device's).
 *  - "Item sales" are line totals BEFORE the bill's discount and tax: that's
 *    what each dish earned on the menu. The discount and tax are shown once,
 *    for the whole period, in the summary.
 */

export type RangePreset = "today" | "yesterday" | "last7" | "last30";

export const RANGE_LABEL: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
};

/** From `from` (included) up to `to` (not included), in milliseconds. */
export type DateRange = { from: number; to: number };

/**
 * The days a preset covers, as whole local days.
 *   today     = midnight today → midnight tomorrow
 *   last7     = midnight 6 days ago → midnight tomorrow (today counts as one of the 7)
 */
export function rangeFor(preset: RangePreset, now: Date): DateRange {
  const day = (offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime();
  switch (preset) {
    case "today":
      return { from: day(0), to: day(1) };
    case "yesterday":
      return { from: day(-1), to: day(0) };
    case "last7":
      return { from: day(-6), to: day(1) };
    case "last30":
      return { from: day(-29), to: day(1) };
  }
}

export function inRange(at: IsoDateTime, range: DateRange): boolean {
  const time = Date.parse(at);
  return time >= range.from && time < range.to;
}

export function invoicesIn(invoices: Invoice[], range: DateRange): Invoice[] {
  return invoices.filter((invoice) => inRange(invoice.issuedAt, range));
}

export type SalesSummary = {
  bills: number;
  subtotalPaise: Paise;
  discountPaise: Paise;
  discountedBills: number;
  taxPaise: Paise;
  totalPaise: Paise;
  /** Total ÷ bills, to the nearest paisa (0 when there are no bills). */
  averagePaise: Paise;
};

/** The headline numbers: what was sold, given away, taxed and taken. */
export function salesSummary(invoices: Invoice[]): SalesSummary {
  const totalPaise = sumPaise(invoices.map((i) => i.totalPaise));
  return {
    bills: invoices.length,
    subtotalPaise: sumPaise(invoices.map((i) => i.subtotalPaise)),
    discountPaise: sumPaise(invoices.map((i) => i.discountPaise)),
    discountedBills: invoices.filter((i) => i.discountPaise > 0).length,
    taxPaise: sumPaise(invoices.map((i) => i.taxPaise)),
    totalPaise,
    averagePaise: invoices.length === 0 ? 0 : Math.round(totalPaise / invoices.length),
  };
}

export type ItemSale = { name: string; quantity: number; revenuePaise: Paise };

/**
 * How much of each dish was sold, best sellers first (by money, then by how
 * many). Sizes are separate dishes here: "Paneer Tikka (Half)" and "(Full)".
 */
export function itemSales(invoices: Invoice[]): ItemSale[] {
  const byName = new Map<string, ItemSale>();
  for (const line of invoices.flatMap((i) => i.lines)) {
    const current = byName.get(line.name) ?? {
      name: line.name,
      quantity: 0,
      revenuePaise: 0,
    };
    byName.set(line.name, {
      name: line.name,
      quantity: current.quantity + line.quantity,
      revenuePaise: current.revenuePaise + line.lineTotalPaise,
    });
  }
  return [...byName.values()].sort(
    (a, b) =>
      b.revenuePaise - a.revenuePaise ||
      b.quantity - a.quantity ||
      a.name.localeCompare(b.name),
  );
}

export type HourBucket = { hour: number; bills: number; totalPaise: Paise };

/**
 * Sales per hour of the day (local time), from the first busy hour to the
 * last, with empty hours in between kept (a gap in service is worth seeing).
 *   hour 13 = 1:00 pm to 1:59 pm
 */
export function salesByHour(invoices: Invoice[]): HourBucket[] {
  if (invoices.length === 0) return [];
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    bills: 0,
    totalPaise: 0,
  }));
  for (const invoice of invoices) {
    const bucket = buckets[new Date(invoice.issuedAt).getHours()]!;
    bucket.bills += 1;
    bucket.totalPaise += invoice.totalPaise;
  }
  const busy = buckets.filter((b) => b.bills > 0).map((b) => b.hour);
  return buckets.slice(Math.min(...busy), Math.max(...busy) + 1);
}

/** "1 pm", "11 am", "12 pm": short labels for an hour axis. */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

export type TypeSale = { type: OrderType; bills: number; totalPaise: Paise };

/** Dine-in vs takeaway vs delivery: bills and money for each (all three, always). */
export function salesByType(invoices: Invoice[]): TypeSale[] {
  return (["dine-in", "takeaway", "delivery"] as const).map((type) => {
    const mine = invoices.filter((i) => i.orderType === type);
    return {
      type,
      bills: mine.length,
      totalPaise: sumPaise(mine.map((i) => i.totalPaise)),
    };
  });
}

export type Cancellation = {
  orderNumber: number;
  /** A whole order, or one dish from an order. */
  kind: "order" | "item";
  name: string; // "Order 104" or "Garlic Naan"
  quantity: number;
  /** Menu value that was NOT charged (before discount and tax). */
  valuePaise: Paise;
  reason: string;
};

/**
 * What was cancelled in the period, and why: a cooking or waste problem shows
 * up here first. A whole order counts on the day it was cancelled; a single
 * dish on the day its order was placed (dishes don't record their own time).
 */
export function cancellations(orders: Order[], range: DateRange): Cancellation[] {
  const rows: Cancellation[] = [];
  for (const order of orders) {
    if (order.status === "cancelled") {
      const cancelledAt =
        order.statusHistory.findLast((c) => c.status === "cancelled")?.at ??
        order.updatedAt;
      if (!inRange(cancelledAt, range)) continue;
      const active = order.items.filter((i) => i.status === "active");
      rows.push({
        orderNumber: order.number,
        kind: "order",
        name: `Order ${order.number}`,
        quantity: active.reduce((sum, i) => sum + i.quantity, 0),
        valuePaise: sumPaise(active.map((i) => itemUnitTotal(i) * i.quantity)),
        reason: order.cancelReason ?? "No reason given",
      });
    } else if (inRange(order.createdAt, range)) {
      for (const item of order.items.filter((i) => i.status === "cancelled")) {
        rows.push({
          orderNumber: order.number,
          kind: "item",
          name: item.name,
          quantity: item.quantity,
          valuePaise: itemUnitTotal(item) * item.quantity,
          reason: item.cancelReason ?? "No reason given",
        });
      }
    }
  }
  return rows.sort((a, b) => b.orderNumber - a.orderNumber);
}

export type FloorNow = {
  tables: number;
  occupied: number;
  /** Free to seat right now: Available. */
  available: number;
  /** Orders not paid or cancelled yet. */
  openOrders: number;
};

/** Right now on the floor: how many tables are busy, how many orders are open. */
export function floorNow(tables: RestaurantTable[], orders: Order[]): FloorNow {
  return {
    tables: tables.length,
    occupied: tables.filter((t) => t.status === "occupied").length,
    available: tables.filter((t) => t.status === "available").length,
    openOrders: orders.filter((o) => isOrderOpen(o.status)).length,
  };
}

/**
 * Turns rows into CSV text that Excel and Google Sheets open correctly.
 * Any value with a comma, quote or line break is wrapped in quotes, and quotes
 * inside are doubled:  He said "hi"  →  "He said ""hi"""
 */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
