import type { Id } from "@/types/common";
import type { Order } from "@/types/order";
import { DomainError } from "../errors";
import { ORDER_STATUS_LABEL, moveOrder, type ChangeContext } from "./order-state-machine";

/**
 * CANCELLING ONE ITEM
 *
 *  - Allowed only while the order is "new" or "preparing". Once the kitchen has
 *    marked it ready, the food exists: cancel the whole order instead (or serve it).
 *  - A reason is required, so the manager can see why money was lost.
 *  - The item stays on the order, marked "cancelled", so the history is kept;
 *    calculateBill() simply doesn't charge for it.
 *  - If that was the last active item, the whole order becomes "cancelled".
 */
export function cancelItem(
  order: Order,
  itemId: Id,
  reason: string,
  context: ChangeContext,
): Order {
  if (order.status !== "new" && order.status !== "preparing") {
    throw new DomainError(
      `Items can't be cancelled once order ${order.number} is ${ORDER_STATUS_LABEL[order.status]}.`,
    );
  }
  const item = order.items.find((i) => i.id === itemId);
  if (!item) {
    throw new DomainError(`That item isn't on order ${order.number}.`);
  }
  if (item.status === "cancelled") {
    throw new DomainError(`${item.name} is already cancelled.`);
  }
  if (!reason.trim()) {
    throw new DomainError(`Give a reason for cancelling ${item.name}.`);
  }

  const updated: Order = {
    ...order,
    items: order.items.map((i) =>
      i.id === itemId ? { ...i, status: "cancelled", cancelReason: reason.trim() } : i,
    ),
    updatedAt: context.at,
  };

  const anythingLeft = updated.items.some((i) => i.status === "active");
  return anythingLeft
    ? updated
    : moveOrder(updated, "cancelled", context, "All items were cancelled");
}
