import type { Paise } from "@/types/common";
import type { Invoice, Payment, PaymentMethod } from "@/types/payment";
import { allocate, sumPaise } from "../money";
import { invoiceLabel } from "./checkout";

/**
 * TRANSACTION HISTORY — every payment taken, newest first, with the invoice it
 * belongs to. A split bill shows as several payments with the same invoice.
 */

export const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "upi"];

export type MethodFilter = PaymentMethod | "all";

export type TransactionFilters = {
  method: MethodFilter;
  /** Matches an invoice ("INV-1003", "1003") or an order number ("101", "#101"). */
  query: string;
};

export const NO_TRANSACTION_FILTERS: TransactionFilters = { method: "all", query: "" };

export type TransactionRow = { payment: Payment; invoice?: Invoice };

/** Does this search text match the payment's invoice or order? */
function matches(row: TransactionRow, query: string): boolean {
  const words = query.trim().toLowerCase().replace(/^#/, "");
  if (words === "") return true;
  const { invoice } = row;
  if (!invoice) return false;
  return [
    invoiceLabel(invoice).toLowerCase(),
    String(invoice.number),
    String(invoice.orderNumber),
  ].some((text) => text.includes(words));
}

/** The payments to list: filtered, newest first (ties: the later-saved one first). */
export function transactionRows(
  payments: Payment[],
  invoices: Invoice[],
  filters: TransactionFilters,
): TransactionRow[] {
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  return payments
    .map((payment, index) => ({
      payment,
      invoice: invoiceById.get(payment.invoiceId),
      index,
    }))
    .filter(
      ({ payment }) => filters.method === "all" || payment.method === filters.method,
    )
    .filter((row) => matches(row, filters.query))
    .sort(
      (a, b) =>
        Date.parse(b.payment.createdAt) - Date.parse(a.payment.createdAt) ||
        b.index - a.index,
    )
    .map(({ payment, invoice }) => ({ payment, invoice }));
}

export type MethodTotal = { count: number; totalPaise: Paise };

export type PaymentTotals = MethodTotal & {
  byMethod: Record<PaymentMethod, MethodTotal>;
  /** Cash handed back as change (it never stays in the drawer). */
  changePaise: Paise;
};

/**
 * Money taken, all together and per method. Only `amountPaise` counts: cash
 * the guest handed over beyond that went straight back as change.
 */
export function paymentTotals(payments: Payment[]): PaymentTotals {
  const byMethod = Object.fromEntries(
    PAYMENT_METHODS.map((method) => {
      const mine = payments.filter((p) => p.method === method);
      return [
        method,
        { count: mine.length, totalPaise: sumPaise(mine.map((p) => p.amountPaise)) },
      ];
    }),
  ) as Record<PaymentMethod, MethodTotal>;

  return {
    count: payments.length,
    totalPaise: sumPaise(payments.map((p) => p.amountPaise)),
    byMethod,
    changePaise: sumPaise(payments.map((p) => p.changePaise ?? 0)),
  };
}

/**
 * Indian GST on restaurant bills is two equal halves: Central (CGST) and State
 * (SGST). allocate() splits the tax so the halves add up to it exactly:
 *   5535 → { cgst: 2768, sgst: 2767 }
 */
export function splitGst(taxPaise: Paise): { cgstPaise: Paise; sgstPaise: Paise } {
  const [cgstPaise = 0, sgstPaise = 0] = allocate(taxPaise, [1, 1]);
  return { cgstPaise, sgstPaise };
}
