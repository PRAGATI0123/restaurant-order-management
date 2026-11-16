import type { Id, IsoDateTime } from "@/types/common";
import type { Order, OrderItem } from "@/types/order";
import { DomainError } from "../errors";
import { addToCart } from "./cart";
import { ORDER_STATUS_LABEL, isOrderOpen } from "./order-state-machine";

/**
 * CHANGING AN ORDER AFTER IT WAS SENT
 * Pure functions: they return new orders and never touch the ones passed in.
 */

/** Can more dishes be added to this order? Only while the kitchen is still on it. */
export function canAddItems(order: Order): boolean {
  return order.status === "new" || order.status === "preparing";
}

/**
 * ADD DISHES to an order that's already in the kitchen ("one more naan").
 * Allowed while it's New or Preparing. Once it's Ready or Served the kitchen
 * has finished that ticket, so extra dishes go on a NEW order for the table
 * (a "second round"), which the kitchen sees as a fresh ticket.
 * Same dish + same choices adds up with the existing line (cart rules).
 */
export function addItemsToOrder(
  order: Order,
  lines: OrderItem[],
  at: IsoDateTime,
): Order {
  if (!canAddItems(order)) {
    throw new DomainError(
      `Order ${order.number} is ${ORDER_STATUS_LABEL[order.status]}. Start a new order for more dishes.`,
    );
  }
  if (lines.length === 0) throw new DomainError("Choose at least one dish to add.");
  const active = order.items.filter((i) => i.status === "active");
  const cancelled = order.items.filter((i) => i.status === "cancelled");
  const merged = lines.reduce((items, line) => addToCart(items, line), active);
  return { ...order, items: [...merged, ...cancelled], updatedAt: at };
}

export type SplitTarget = {
  id: Id;
  number: number;
  at: IsoDateTime;
};

/**
 * SPLIT AN ORDER: move some dishes (or part of a quantity) into a NEW order,
 * e.g. friends at one table who want separate bills.
 *
 *  - Only open orders (not paid, not cancelled) can be split.
 *  - `moves` says how many of each line move: { "line-naan": 2 }.
 *  - At least one dish must move, and at least one must stay.
 *  - The new order keeps the same type, table, customer and kitchen status,
 *    so nothing is cooked twice and nothing is lost.
 *  - A discount stays on the original order only.
 */
export function splitOrder(
  order: Order,
  moves: Record<Id, number>,
  target: SplitTarget,
): { original: Order; created: Order } {
  if (!isOrderOpen(order.status)) {
    throw new DomainError(
      `Order ${order.number} is ${ORDER_STATUS_LABEL[order.status]}; it can't be split.`,
    );
  }
  const wanted = Object.entries(moves).filter(([, quantity]) => quantity !== 0);
  if (wanted.length === 0) throw new DomainError("Choose at least one dish to move.");

  const moved: OrderItem[] = [];
  const kept: OrderItem[] = [];
  for (const item of order.items) {
    const quantity = moves[item.id] ?? 0;
    if (quantity === 0 || item.status !== "active") {
      kept.push(item);
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > item.quantity) {
      throw new DomainError(`You can move 1 to ${item.quantity} × ${item.name}.`);
    }
    // The moved part gets its own line id in the new order.
    moved.push({ ...item, id: `${item.id}~${target.id}`, quantity });
    if (quantity < item.quantity)
      kept.push({ ...item, quantity: item.quantity - quantity });
  }
  for (const [lineId] of wanted) {
    if (!order.items.some((i) => i.id === lineId && i.status === "active")) {
      throw new DomainError("One of those dishes isn't on this order any more.");
    }
  }
  if (!kept.some((i) => i.status === "active")) {
    throw new DomainError(`Leave at least one dish on order ${order.number}.`);
  }

  const created: Order = {
    id: target.id,
    number: target.number,
    type: order.type,
    status: order.status,
    tableIds: [...order.tableIds],
    ...(order.customerName ? { customerName: order.customerName } : {}),
    ...(order.delivery ? { delivery: order.delivery } : {}),
    items: moved,
    statusHistory: [...order.statusHistory],
    splitFromNumber: order.number,
    createdBy: order.createdBy,
    createdAt: order.createdAt, // same timer in the kitchen as the original
    updatedAt: target.at,
  };
  return { original: { ...order, items: kept, updatedAt: target.at }, created };
}
