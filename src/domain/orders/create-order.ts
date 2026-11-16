import type { Id, IsoDateTime } from "@/types/common";
import type { DeliveryDetails, Order, OrderItem, OrderType } from "@/types/order";
import { calculateBill } from "../billing/calculate-bill";
import { DomainError } from "../errors";

/** Order numbers start at 101 and go up by one, so staff can say "order 104". */
export const FIRST_ORDER_NUMBER = 101;

export function nextOrderNumber(orders: Order[]): number {
  return orders.reduce(
    (max, order) => Math.max(max, order.number + 1),
    FIRST_ORDER_NUMBER,
  );
}

export type NewOrderInput = {
  id: Id;
  number: number;
  type: OrderType;
  items: OrderItem[];
  customerName?: string;
  delivery?: DeliveryDetails;
  createdBy: Id;
  at: IsoDateTime;
};

/**
 * Creates a brand-new order with status "new" (Step 8: the first state).
 *
 * Rules:
 *  - At least one item, and every item must be valid (calculateBill checks
 *    quantities and prices, so a bad line can never reach the kitchen).
 *  - A delivery order needs the customer's name, phone and address.
 *  - A dine-in order gets its table separately (startOrderAtTable), because
 *    that rule needs to see the whole floor.
 */
export function createOrder(input: NewOrderInput): Order {
  const items = input.items.filter((item) => item.status === "active");
  if (items.length === 0) {
    throw new DomainError("Add at least one item before sending the order.");
  }
  calculateBill({ items, taxRateBasisPoints: 0 }); // throws on any bad line
  if (input.type === "delivery" && !input.delivery) {
    throw new DomainError(
      "A delivery order needs the customer's name, phone and address.",
    );
  }

  const customerName = input.customerName?.trim();
  return {
    id: input.id,
    number: input.number,
    type: input.type,
    status: "new",
    tableIds: [],
    ...(input.type === "takeaway" && customerName ? { customerName } : {}),
    ...(input.type === "delivery" && input.delivery ? { delivery: input.delivery } : {}),
    items,
    statusHistory: [{ status: "new", at: input.at, by: input.createdBy }],
    createdBy: input.createdBy,
    createdAt: input.at,
    updatedAt: input.at,
  };
}
