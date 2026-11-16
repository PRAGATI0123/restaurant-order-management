import type { Id } from "@/types/common";
import type { Order, OrderStatus, OrderType } from "@/types/order";

/** One place for how orders look, so the list, details and kitchen all match. */

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  "dine-in": "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export const ORDER_STATUS_BADGE: Record<
  OrderStatus,
  "primary" | "accent" | "success" | "steel" | "outline" | "danger"
> = {
  new: "primary",
  preparing: "accent",
  ready: "success",
  served: "steel",
  paid: "outline",
  cancelled: "danger",
};

/**
 * Where the order is going: "T5" or "T4 + T5" for dine-in, the customer's name
 * for takeaway and delivery.
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

/** "Paneer Tikka, 2 × Sweet Lassi and 1 more", for a quick look in the list. */
export function itemsPreview(order: Order, max = 2): string {
  const active = order.items.filter((i) => i.status === "active");
  const shown = active
    .slice(0, max)
    .map((i) => (i.quantity > 1 ? `${i.quantity} × ${i.name}` : i.name));
  const rest = active.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.join(", ");
}
