import { calculateBill } from "@/domain/billing/calculate-bill";
import type { Paise } from "@/types/common";
import type { Order } from "@/types/order";

/**
 * The two numbers a table tile shows: how many items, and the bill so far.
 * The total comes from calculateBill (Step 7), the same function the checkout
 * uses, so the floor plan and the bill can never disagree. The GST rate comes
 * from Settings (screens pass it in with useTaxRate()).
 */
export function summarizeOrder(
  order: Order,
  taxRateBasisPoints: number,
): { itemCount: number; totalPaise: Paise } {
  const bill = calculateBill({
    items: order.items,
    discount: order.discount,
    taxRateBasisPoints,
  });
  const itemCount = bill.lines.reduce((sum, line) => sum + line.quantity, 0);
  return { itemCount, totalPaise: bill.totalPaise };
}

/**
 * The same, for ALL the open orders at one table (a second round, or split
 * bills): numbers like "#102 +1", items and bills added up, and the time of
 * the oldest order (how long the guests have been ordering).
 */
export function summarizeOrders(orders: Order[], taxRateBasisPoints: number) {
  const summaries = orders.map((order) => summarizeOrder(order, taxRateBasisPoints));
  const oldest = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  return {
    label:
      orders.length === 0
        ? ""
        : orders.length === 1
          ? `#${orders[0]!.number}`
          : `#${oldest!.number} +${orders.length - 1}`,
    itemCount: summaries.reduce((sum, s) => sum + s.itemCount, 0),
    totalPaise: summaries.reduce((sum, s) => sum + s.totalPaise, 0),
    since: oldest?.createdAt,
  };
}
