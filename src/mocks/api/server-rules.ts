import { GST_RATES_BASIS_POINTS } from "@/lib/validation/settings";
import type { MenuItem } from "@/types/menu";
import type { Order } from "@/types/order";
import type { Invoice, Payment } from "@/types/payment";
import type { RestaurantSettings } from "@/types/settings";
import type { OutboxEntry } from "@/types/sync";
import type { RestaurantTable } from "@/types/table";

/**
 * THE SERVER'S OWN CHECKS. A real server never trusts a till: the till might
 * run old code, have a bug, or have been tampered with. So the server checks
 * every record again before saving it. A record that fails is REJECTED (like
 * HTTP 422): the till shows it to a person instead of retrying forever.
 *
 * `saved` is what the server already has, keyed "kind:id".
 */
export type ServerData = Map<string, unknown>;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const isWholePaise = (n: unknown) => Number.isSafeInteger(n) && (n as number) >= 0;

function checkOrder(order: Order, saved: ServerData): string | undefined {
  if (!Number.isSafeInteger(order.number) || order.number < 1) {
    return "The order has no valid number.";
  }
  const active = order.items.filter((i) => i.status === "active");
  if (order.status !== "cancelled" && active.length === 0) {
    return `Order ${order.number} has no dishes.`;
  }
  if (order.items.some((i) => !Number.isSafeInteger(i.quantity) || i.quantity < 1)) {
    return `Order ${order.number} has a dish with an impossible quantity.`;
  }
  // Two tills offline at the same time could both create "order 107".
  for (const [key, value] of saved) {
    if (!key.startsWith("order:") || key === `order:${order.id}`) continue;
    if ((value as Order).number === order.number) {
      return `Order number ${order.number} is already used by another till.`;
    }
  }
  return undefined;
}

function checkInvoice(invoice: Invoice): string | undefined {
  const label = `INV-${invoice.number}`;
  const amounts = [
    invoice.subtotalPaise,
    invoice.discountPaise,
    invoice.taxPaise,
    invoice.totalPaise,
  ];
  if (!amounts.every(isWholePaise))
    return `${label} has an amount that isn't whole paise.`;
  if (sum(invoice.lines.map((l) => l.lineTotalPaise)) !== invoice.subtotalPaise) {
    return `${label}: the lines don't add up to the subtotal.`;
  }
  if (invoice.lines.some((l) => l.unitTotalPaise * l.quantity !== l.lineTotalPaise)) {
    return `${label}: a line total isn't price × quantity.`;
  }
  const expected = invoice.subtotalPaise - invoice.discountPaise + invoice.taxPaise;
  if (invoice.totalPaise !== expected) {
    return `${label}: total should be subtotal − discount + GST.`;
  }
  if (invoice.totalPaise > 0 && invoice.paymentIds.length === 0) {
    return `${label} has no payments.`;
  }
  return undefined;
}

function checkPayment(payment: Payment): string | undefined {
  if (!isWholePaise(payment.amountPaise) || payment.amountPaise === 0) {
    return "A payment must be more than ₹0.";
  }
  if (payment.changePaise !== undefined && payment.method !== "cash") {
    return "Only cash payments can have change.";
  }
  return undefined;
}

function checkMenuItem(item: MenuItem): string | undefined {
  if (item.name.trim() === "") return "A dish has no name.";
  const prices =
    item.variants.length > 0 ? item.variants.map((v) => v.pricePaise) : [item.pricePaise];
  if (!prices.every((p) => isWholePaise(p) && p > 0)) {
    return `${item.name} needs a price above ₹0.`;
  }
  return undefined;
}

function checkTable(table: RestaurantTable): string | undefined {
  return Number.isInteger(table.seats) && table.seats >= 1 && table.seats <= 12
    ? undefined
    : `${table.name} must have 1 to 12 seats.`;
}

function checkSettings(settings: RestaurantSettings): string | undefined {
  if (
    !(GST_RATES_BASIS_POINTS as readonly number[]).includes(settings.taxRateBasisPoints)
  ) {
    return "That GST rate isn't allowed.";
  }
  return undefined;
}

/** The server's verdict on one change: undefined = fine, a message = rejected. */
export function checkOnServer(entry: OutboxEntry, saved: ServerData): string | undefined {
  if (entry.op === "delete") return undefined;
  switch (entry.kind) {
    case "order":
      return checkOrder(entry.data as Order, saved);
    case "invoice":
      return checkInvoice(entry.data as Invoice);
    case "payment":
      return checkPayment(entry.data as Payment);
    case "menuItem":
      return checkMenuItem(entry.data as MenuItem);
    case "table":
      return checkTable(entry.data as RestaurantTable);
    case "settings":
      return checkSettings(entry.data as RestaurantSettings);
    default:
      return undefined; // categories, add-ons, option groups: checked by the forms
  }
}
