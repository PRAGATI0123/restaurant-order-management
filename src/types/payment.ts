import type { Id, IsoDateTime, Paise } from "./common";
import type { Discount, OrderType } from "./order";

/** Simulated payment methods. No real money moves in this app. */
export type PaymentMethod = "cash" | "card" | "upi";

/**
 * One payment towards an order. A split payment is several of these for the
 * same order, e.g. ₹500 cash + ₹762.50 UPI.
 */
export type Payment = {
  id: Id;
  orderId: Id;
  invoiceId: Id;
  method: PaymentMethod;
  amountPaise: Paise; // what this payment covers
  tenderedPaise?: Paise; // cash only: what the guest handed over
  changePaise?: Paise; // cash only: tenderedPaise − amountPaise
  takenBy: Id; // staff id
  createdAt: IsoDateTime;
};

/** One line on an invoice, copied from the order when it was paid. */
export type InvoiceLine = {
  name: string; // "Paneer Tikka (Half)"
  details?: string; // "Medium · + Extra cheese"
  quantity: number;
  unitTotalPaise: Paise;
  lineTotalPaise: Paise;
};

/**
 * THE INVOICE: a frozen copy of the bill at the moment it was paid.
 * It never looks anything up again, so it reads exactly the same years later,
 * even if the menu, prices or tax rate change.
 */
export type Invoice = {
  id: Id;
  number: number; // shown as "INV-1001"
  orderId: Id;
  orderNumber: number;
  orderType: OrderType;
  where: string; // "T4 + T5", "Rohan"
  lines: InvoiceLine[];
  subtotalPaise: Paise;
  discount?: Discount;
  discountPaise: Paise;
  taxRateBasisPoints: number;
  taxPaise: Paise;
  totalPaise: Paise;
  paymentIds: Id[];
  issuedBy: Id; // staff id
  issuedAt: IsoDateTime;
};
