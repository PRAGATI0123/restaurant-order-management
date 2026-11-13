import type { Id, IsoDateTime, Paise } from "./common";

/** Simulated payment methods. No real money moves in this app. */
export type PaymentMethod = "cash" | "card" | "upi";

/**
 * One payment towards an order. A split payment is several of these for the
 * same order, e.g. ₹500 cash + ₹762.50 UPI.
 */
export type Payment = {
  id: Id;
  orderId: Id;
  method: PaymentMethod;
  amountPaise: Paise; // what this payment covers
  tenderedPaise?: Paise; // cash only: what the guest handed over
  changePaise?: Paise; // cash only: tenderedPaise − amountPaise
  takenBy: Id; // staff id
  createdAt: IsoDateTime;
};
