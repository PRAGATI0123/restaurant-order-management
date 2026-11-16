import type { Id } from "@/types/common";
import type { Order } from "@/types/order";

/**
 * Where the order is going: "T5" or "T4 + T5" for dine-in, the customer's name
 * for takeaway and delivery. Used on screens, tickets and invoices.
 */
export function orderWhere(
  order: Order,
  tableName: (id: Id) => string | undefined,
): string {
  if (order.type === "dine-in") {
    const names = order.tableIds.map(tableName).filter(Boolean);
    return names.length > 0 ? names.join(" + ") : "No table";
  }
  if (order.type === "delivery") return order.delivery?.customerName ?? "Delivery";
  return order.customerName ?? "Walk-in";
}
