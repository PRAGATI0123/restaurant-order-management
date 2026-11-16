import type { Order, OrderStatus, OrderType } from "@/types/order";
import { isOrderOpen } from "./order-state-machine";

/** "open" = everything not paid or cancelled; the list's default. */
export type OrderStatusFilter = "open" | "all" | OrderStatus;

export type OrderListFilters = {
  status: OrderStatusFilter;
  type: OrderType | "all";
  query: string;
};

export const DEFAULT_ORDER_FILTERS: OrderListFilters = {
  status: "open",
  type: "all",
  query: "",
};

function matchesStatus(order: Order, status: OrderStatusFilter): boolean {
  if (status === "all") return true;
  if (status === "open") return isOrderOpen(order.status);
  return order.status === status;
}

/**
 * The orders to show, newest first.
 * Search matches the order number ("104" or "#104") and whatever `searchText`
 * gives for an order: table names, customer name, phone.
 */
export function filterOrders(
  orders: Order[],
  filters: OrderListFilters,
  searchText: (order: Order) => string,
): Order[] {
  const query = filters.query.trim().toLowerCase().replace(/^#/, "");
  return orders
    .filter((order) => matchesStatus(order, filters.status))
    .filter((order) => filters.type === "all" || order.type === filters.type)
    .filter((order) => {
      if (!query) return true;
      return (
        String(order.number).startsWith(query) ||
        searchText(order).toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** How many orders are in each status, plus how many are open. For the filter chips. */
export function countOrders(orders: Order[]): Record<OrderStatusFilter, number> {
  const counts: Record<OrderStatusFilter, number> = {
    open: 0,
    all: orders.length,
    new: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    paid: 0,
    cancelled: 0,
  };
  for (const order of orders) {
    counts[order.status] += 1;
    if (isOrderOpen(order.status)) counts.open += 1;
  }
  return counts;
}
