import type { Id, IsoDateTime } from "@/types/common";
import type { Discount, Order } from "@/types/order";
import type { Invoice, InvoiceLine, Payment } from "@/types/payment";
import type { RestaurantDetails } from "@/types/settings";
import type { RestaurantTable } from "@/types/table";
import { DomainError } from "../errors";
import {
  ORDER_STATUS_LABEL,
  isOrderOpen,
  moveOrder,
} from "../orders/order-state-machine";
import { tablesToFreeAfter } from "../tables/table-guards";
import { calculateBill, type Bill } from "./calculate-bill";
import { checkDiscount, checkFullPayment, type PaymentDraft } from "./payments";

/** The first invoice is INV-1001; each one after is the next number. */
export const FIRST_INVOICE_NUMBER = 1001;

export function nextInvoiceNumber(invoices: Pick<Invoice, "number">[]): number {
  return Math.max(FIRST_INVOICE_NUMBER - 1, ...invoices.map((i) => i.number)) + 1;
}

/** 1001 → "INV-1001" */
export function invoiceLabel(invoice: Pick<Invoice, "number">): string {
  return `INV-${invoice.number}`;
}

/**
 * The bill's lines as a guest reads them: size in the name, choices underneath.
 *   "Paneer Tikka (Half)"  /  "Medium · + Extra cheese"
 * Used on the checkout screen AND frozen onto the invoice, so both read the same.
 */
export function invoiceLines(order: Order, bill: Bill): InvoiceLine[] {
  return bill.lines.map((line) => {
    const item = order.items.find((i) => i.id === line.itemId);
    const details = [
      ...(item?.modifiers ?? []).map((m) => m.name),
      ...(item?.addOns ?? []).map((a) => `+ ${a.name}`),
    ].join(" · ");
    return {
      name: item?.variant ? `${line.name} (${item.variant.name})` : line.name,
      ...(details ? { details } : {}),
      quantity: line.quantity,
      unitTotalPaise: line.unitTotalPaise,
      lineTotalPaise: line.lineTotalPaise,
    };
  });
}

/**
 * Puts a discount on an order's bill, or takes it off (discount = undefined).
 * Only while the order is open: a paid bill never changes.
 */
export function setOrderDiscount(
  order: Order,
  discount: Discount | undefined,
  at: IsoDateTime,
): Order {
  if (!isOrderOpen(order.status)) {
    throw new DomainError(
      `Order ${order.number} is ${ORDER_STATUS_LABEL[order.status]}; its bill can't change.`,
    );
  }
  if (!discount) {
    const copy: Order = { ...order, updatedAt: at };
    delete copy.discount;
    return copy;
  }
  const { subtotalPaise } = calculateBill({ items: order.items, taxRateBasisPoints: 0 });
  return { ...order, discount: checkDiscount(discount, subtotalPaise), updatedAt: at };
}

export type SettleInput = {
  order: Order;
  tables: RestaurantTable[];
  orders: Order[];
  parts: PaymentDraft[];
  taxRateBasisPoints: number;
  /** The restaurant's details from Settings, printed on the invoice. */
  restaurant: RestaurantDetails;
  /** Where the order went, already written out: "T4 + T5", "Rohan". */
  where: string;
  invoiceNumber: number;
  at: IsoDateTime;
  by: Id;
  newId: (prefix: string) => Id;
};

/**
 * SETTLE AN ORDER: everything that happens when "Complete payment" is tapped,
 * worked out together so it all happens or none of it does:
 *
 *  1. The order must be Served (the state machine allows Served → Paid only).
 *  2. The bill is worked out again from the order itself, never trusted from
 *     the screen, and the payments must add up to it exactly.
 *  3. The order becomes Paid.
 *  4. Each part becomes a saved Payment; an Invoice freezes the bill.
 *  5. Its tables go to Cleaning, if no other order is still open there.
 */
export function settleOrder(input: SettleInput): {
  order: Order;
  payments: Payment[];
  invoice: Invoice;
  tables: RestaurantTable[];
} {
  const { order, at, by, newId } = input;
  if (order.status !== "served") {
    throw new DomainError(
      order.status === "paid"
        ? `Order ${order.number} is already paid.`
        : `Order ${order.number} is ${ORDER_STATUS_LABEL[order.status]}. Serve it before taking payment.`,
    );
  }

  const bill = calculateBill({
    items: order.items,
    discount: order.discount,
    taxRateBasisPoints: input.taxRateBasisPoints,
  });
  const checked = checkFullPayment(bill.totalPaise, input.parts);
  const paid = moveOrder(order, "paid", { at, by });

  const invoiceId = newId("inv");
  const payments: Payment[] = checked.map((part) => ({
    ...part,
    id: newId("pay"),
    orderId: order.id,
    invoiceId,
    takenBy: by,
    createdAt: at,
  }));

  const lines = invoiceLines(order, bill);

  const invoice: Invoice = {
    id: invoiceId,
    number: input.invoiceNumber,
    restaurant: input.restaurant,
    orderId: order.id,
    orderNumber: order.number,
    orderType: order.type,
    where: input.where,
    lines,
    subtotalPaise: bill.subtotalPaise,
    ...(order.discount ? { discount: order.discount } : {}),
    discountPaise: bill.discountPaise,
    taxRateBasisPoints: input.taxRateBasisPoints,
    taxPaise: bill.taxPaise,
    totalPaise: bill.totalPaise,
    paymentIds: payments.map((p) => p.id),
    issuedBy: by,
    issuedAt: at,
  };

  const ordersAfter = input.orders.map((o) => (o.id === paid.id ? paid : o));
  const tables = tablesToFreeAfter(paid, input.tables, ordersAfter);

  return { order: paid, payments, invoice, tables };
}
