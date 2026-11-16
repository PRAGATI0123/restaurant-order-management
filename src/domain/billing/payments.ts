import type { Paise } from "@/types/common";
import type { Discount } from "@/types/order";
import type { PaymentMethod } from "@/types/payment";
import { DomainError } from "../errors";
import { assertPaise, formatRupees, sumPaise } from "../money";
import { splitEqually } from "./split-bill";

/**
 * TAKING PAYMENT — business rules
 *
 *  1. A bill can be paid in parts, with any mix of cash, card and UPI.
 *  2. Each part must be more than ₹0 and can't be more than what's still due.
 *     (Paying too much by card would need a refund; we just don't allow it.)
 *  3. Cash is different: the guest can HAND OVER more than the part they pay.
 *     The difference is change, given back right away.
 *  4. The order is settled only when the parts add up to the total EXACTLY.
 */

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
};

/** A part payment that has been entered but not saved yet. */
export type PaymentDraft = {
  method: PaymentMethod;
  amountPaise: Paise;
  /** Cash only: what the guest handed over. Missing = exact amount. */
  tenderedPaise?: Paise;
};

/** A checked part payment, with the change worked out (cash). */
export type CheckedPayment = PaymentDraft & { changePaise?: Paise };

/** How much is still left to pay after these parts. */
export function amountDue(totalPaise: Paise, parts: Pick<PaymentDraft, "amountPaise">[]) {
  return totalPaise - sumPaise(parts.map((p) => p.amountPaise));
}

/**
 * Checks one part payment against what's still due, and works out the change.
 *   checkPayment({ method: "cash", amountPaise: 128600, tenderedPaise: 150000 }, 128600)
 *   → { …, changePaise: 21400 }    (₹1,286 bill, guest gave ₹1,500, ₹214 change)
 */
export function checkPayment(draft: PaymentDraft, duePaise: Paise): CheckedPayment {
  assertPaise(draft.amountPaise, "Amount to pay");
  if (duePaise <= 0) throw new DomainError("This bill is already fully paid.");
  if (draft.amountPaise === 0) throw new DomainError("Enter an amount to pay.");
  if (draft.amountPaise > duePaise) {
    throw new DomainError(
      `${formatRupees(draft.amountPaise)} is more than what's left to pay (${formatRupees(duePaise)}).`,
    );
  }

  if (draft.method !== "cash") {
    return { method: draft.method, amountPaise: draft.amountPaise };
  }
  const tendered = draft.tenderedPaise ?? draft.amountPaise;
  assertPaise(tendered, "Cash received");
  if (tendered < draft.amountPaise) {
    throw new DomainError(
      `Cash received (${formatRupees(tendered)}) is less than the amount to pay (${formatRupees(draft.amountPaise)}).`,
    );
  }
  return {
    method: "cash",
    amountPaise: draft.amountPaise,
    tenderedPaise: tendered,
    changePaise: tendered - draft.amountPaise,
  };
}

/** Throws unless the parts pay the bill exactly. Returns the checked parts. */
export function checkFullPayment(
  totalPaise: Paise,
  parts: PaymentDraft[],
): CheckedPayment[] {
  if (totalPaise === 0 && parts.length === 0) return []; // a 100% discount: nothing to pay
  if (parts.length === 0) throw new DomainError("Add a payment first.");
  let due = totalPaise;
  const checked = parts.map((part) => {
    const result = checkPayment(part, due);
    due -= result.amountPaise;
    return result;
  });
  if (due !== 0) {
    throw new DomainError(`${formatRupees(due)} is still left to pay.`);
  }
  return checked;
}

/**
 * Quick buttons for cash: the exact amount, then the next round amounts a
 * guest is likely to hand over (notes of ₹50, ₹100, ₹500, ₹2000).
 *   ₹1,286.00 → [₹1,286, ₹1,300, ₹1,500, ₹2,000]
 *   ₹40.00    → [₹40, ₹50, ₹100, ₹500]
 */
export function quickCashAmounts(duePaise: Paise, max = 4): Paise[] {
  if (duePaise <= 0) return [];
  const roundUpTo = (step: Paise) => Math.ceil(duePaise / step) * step;
  const options = [duePaise, ...[5000, 10000, 50000, 200000].map(roundUpTo)];
  return [...new Set(options)].sort((a, b) => a - b).slice(0, max);
}

/**
 * "Split equally between N guests": what the NEXT guest pays. The shares come
 * from splitEqually, so when all N have paid, they add up to the total exactly.
 * Never more than what's still due.
 */
export function nextEqualShare(
  totalPaise: Paise,
  guests: number,
  partsPaid: number,
  duePaise: Paise,
): Paise {
  const share = splitEqually(totalPaise, guests)[partsPaid] ?? duePaise;
  return Math.min(share, duePaise);
}

/**
 * Checks a discount before it's put on a bill:
 *  - percent: more than 0% and at most 100%
 *  - fixed: more than ₹0 and not more than the bill's subtotal
 *  - reason: at most 60 characters
 * Returns it cleaned up (reason trimmed, empty reason dropped).
 */
export function checkDiscount(discount: Discount, subtotalPaise: Paise): Discount {
  const reason = discount.reason?.trim();
  if (reason && reason.length > 60) {
    throw new DomainError("Keep the reason under 60 characters.");
  }
  const withReason = reason ? { reason } : {};

  if (discount.kind === "percent") {
    const bp = discount.basisPoints;
    if (!Number.isInteger(bp) || bp <= 0 || bp > 10_000) {
      throw new DomainError(
        "A percentage discount must be more than 0% and at most 100%.",
      );
    }
    return { kind: "percent", basisPoints: bp, ...withReason };
  }
  assertPaise(discount.amountPaise, "Discount");
  if (discount.amountPaise === 0) throw new DomainError("Enter a discount amount.");
  if (discount.amountPaise > subtotalPaise) {
    throw new DomainError(
      `The discount can't be more than the bill (${formatRupees(subtotalPaise)}).`,
    );
  }
  return { kind: "fixed", amountPaise: discount.amountPaise, ...withReason };
}
