import { DEFAULT_TAX_RATE_BASIS_POINTS } from "@/config/constants";
import { calculateBill } from "@/domain/billing/calculate-bill";
import type { Paise } from "@/types/common";
import type { Order } from "@/types/order";

/**
 * The two numbers a table tile shows: how many items, and the bill so far.
 * The total comes from calculateBill (Step 7), the same function the checkout
 * will use, so the floor plan and the bill can never disagree.
 */
export function summarizeOrder(order: Order): { itemCount: number; totalPaise: Paise } {
  const bill = calculateBill({
    items: order.items,
    discount: order.discount,
    taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
  });
  const itemCount = bill.lines.reduce((sum, line) => sum + line.quantity, 0);
  return { itemCount, totalPaise: bill.totalPaise };
}
